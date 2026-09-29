import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, delay, map } from 'rxjs/operators';
import { ApiService } from './api.service';

/* ──────────────────────────────────────────
   Models
   ────────────────────────────────────────── */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | Date; // ISO 8601 or Date
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface ChatWidgetState {
  conversations: Conversation[];
  activeConversationId: string | null;
  preferences: {
    hasSeenWelcome: boolean;
  };
}

/* ──────────────────────────────────────────
   Constants
   ────────────────────────────────────────── */
const STORAGE_KEY = 'ai_chat_widget';
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 200;

@Injectable({
  providedIn: 'root',
})
export class AiChatService {
  private apiUrl = 'http://localhost:8081/api/ai';
  private state: ChatWidgetState;

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {
    this.state = this.loadFromStorage();
  }

  /* ────────── Conversation CRUD ────────── */

  getConversations(): Conversation[] {
    return [...this.state.conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getActiveConversation(): Conversation | null {
    if (!this.state.activeConversationId) return null;
    return this.state.conversations.find(c => c.id === this.state.activeConversationId) || null;
  }

  getActiveConversationId(): string | null {
    return this.state.activeConversationId;
  }

  /** Create a new blank conversation and set it active */
  createConversation(): Conversation {
    const conv: Conversation = {
      id: this.generateId(),
      title: 'New conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    this.state.conversations.unshift(conv);
    this.state.activeConversationId = conv.id;
    this.pruneConversations();
    this.saveToStorage();
    return conv;
  }

  /** Switch to an existing conversation */
  setActiveConversation(conversationId: string): Conversation | null {
    const conv = this.state.conversations.find(c => c.id === conversationId);
    if (conv) {
      this.state.activeConversationId = conv.id;
      this.saveToStorage();
    }
    return conv || null;
  }

  /** Delete a conversation */
  deleteConversation(conversationId: string): void {
    this.state.conversations = this.state.conversations.filter(c => c.id !== conversationId);
    if (this.state.activeConversationId === conversationId) {
      this.state.activeConversationId = this.state.conversations.length > 0
        ? this.state.conversations[0].id
        : null;
    }
    this.saveToStorage();
  }

  /** Get or create the active conversation */
  ensureActiveConversation(): Conversation {
    let conv = this.getActiveConversation();
    if (!conv) {
      conv = this.createConversation();
    }
    return conv;
  }

  /** Returns the messages of the active conversation */
  getConversationHistory(): ChatMessage[] {
    const conv = this.ensureActiveConversation();
    return conv ? [...conv.messages] : [];
  }

  /** Clears the messages of the active conversation */
  clearConversation(): void {
    const conv = this.ensureActiveConversation();
    if (conv) {
      conv.messages = [];
      conv.updatedAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  /* ────────── Messaging ────────── */

  /**
   * Send a user message to backend /api/ai/chat when authenticated,
   * with graceful fallback to built-in response engine.
   */
  sendMessage(userMessage: string): Observable<ChatMessage> {
    const conv = this.ensureActiveConversation();

    // Add user message
    const userMsg: ChatMessage = {
      id: this.generateId(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    conv.messages.push(userMsg);

    // Auto-title from first user message
    if (conv.title === 'New conversation') {
      conv.title = userMessage.length > 50
        ? userMessage.substring(0, 50) + '...'
        : userMessage;
    }

    conv.updatedAt = new Date().toISOString();
    this.pruneMessages(conv);
    this.saveToStorage();

    const token = localStorage.getItem('token');
    if (token) {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      });

      return this.http.post<{ reply: string; action?: string; customerId?: any; transactionId?: any }>(
        `${this.apiUrl}/chat`,
        { message: userMessage },
        { headers }
      ).pipe(
        map((res) => {
          const replyText = res.reply || 'No response received from assistant.';
          const assistantMsg: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: replyText,
            timestamp: new Date().toISOString(),
          };
          const c = this.state.conversations.find(x => x.id === conv.id);
          if (c) {
            c.messages.push(assistantMsg);
            c.updatedAt = new Date().toISOString();
            this.pruneMessages(c);
            this.saveToStorage();
          }

          // Trigger immediate data refresh across active UI pages
          const lowerReply = replyText.toLowerCase();
          if (res.action === 'CUSTOMER_CREATED' || lowerReply.includes('customer created successfully')) {
            this.apiService.notifyDataChange({
              type: 'customer',
              action: 'create',
              customerId: res.customerId
            });
          } else if (res.action === 'TRANSACTION_CREATED' || lowerReply.includes('transaction added successfully')) {
            this.apiService.notifyDataChange({
              type: 'transaction',
              action: 'create',
              customerId: res.customerId
            });
          }

          return assistantMsg;
        }),
        catchError((err) => {
          console.warn('Backend AI chat call failed (status ' + err.status + '), using dynamic local fallback:', err);
          return this.createMockAssistantMessage(conv, userMessage);
        })
      );
    }

    // Unauthenticated or demo mode: use local assistant logic
    return this.createMockAssistantMessage(conv, userMessage);
  }

  private createMockAssistantMessage(conv: Conversation, userMessage: string): Observable<ChatMessage> {
    const responseText = this.getMockResponse(userMessage);
    const assistantMsg: ChatMessage = {
      id: this.generateId(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString(),
    };

    const delayMs = 350 + Math.random() * 400;

    return of(assistantMsg).pipe(
      delay(delayMs),
      map((msg) => {
        const c = this.state.conversations.find(x => x.id === conv.id);
        if (c) {
          c.messages.push(msg);
          c.updatedAt = new Date().toISOString();
          this.pruneMessages(c);
          this.saveToStorage();
        }
        return msg;
      })
    );
  }

  /* ────────── Preferences ────────── */

  hasSeenWelcome(): boolean {
    return this.state.preferences.hasSeenWelcome;
  }

  markWelcomeSeen(): void {
    this.state.preferences.hasSeenWelcome = true;
    this.saveToStorage();
  }

  /* ────────── Time-based greeting ────────── */

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Hi there';
  }

  /* ────────── Search conversations ────────── */

  searchConversations(query: string): Conversation[] {
    if (!query.trim()) return this.getConversations();
    const lower = query.toLowerCase();
    return this.getConversations().filter(c =>
      c.title.toLowerCase().includes(lower) ||
      c.messages.some(m => m.content.toLowerCase().includes(lower))
    );
  }

  /* ────────── Format helpers ────────── */

  formatRelativeTime(isoString: string | Date): string {
    const now = Date.now();
    const then = new Date(isoString).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(isoString).toLocaleDateString('en-IN', {
      month: 'short', day: 'numeric',
    });
  }

  formatTime(isoString: string | Date): string {
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Simple markdown-like formatting */
  formatContent(content: string): string {
    let f = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    f = f.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    f = f.replace(/\n/g, '<br>');
    f = f.replace(/(?:^|<br>)- (.+?)(?=<br>|$)/g, '<br>&nbsp;&nbsp;\u2022 $1');
    f = f.replace(/(?:^|<br>)(\d+)\. (.+?)(?=<br>|$)/g, '<br>&nbsp;&nbsp;$1. $2');
    return f;
  }

  /* ────────── Clear on logout ────────── */

  clearAllData(): void {
    this.state = this.defaultState();
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ────────── Private: Storage ────────── */

  private loadFromStorage(): ChatWidgetState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatWidgetState;
        // Basic validation
        if (parsed && Array.isArray(parsed.conversations)) {
          return parsed;
        }
      }
    } catch (_) {}
    return this.defaultState();
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (_) {
      // localStorage full or unavailable — silent fail
    }
  }

  private defaultState(): ChatWidgetState {
    return {
      conversations: [],
      activeConversationId: null,
      preferences: { hasSeenWelcome: false },
    };
  }

  private pruneConversations(): void {
    if (this.state.conversations.length > MAX_CONVERSATIONS) {
      this.state.conversations = this.state.conversations.slice(0, MAX_CONVERSATIONS);
    }
  }

  private pruneMessages(conv: Conversation): void {
    if (conv.messages.length > MAX_MESSAGES_PER_CONVERSATION) {
      conv.messages = conv.messages.slice(-MAX_MESSAGES_PER_CONVERSATION);
    }
  }

  /* ────────── Private: Mock AI ────────── */

  private mockResponses: { keywords: string[]; response: string }[] = [
    {
      keywords: ['hello', 'hi', 'hey', 'namaste'],
      response: 'Hello! I\'m your Digital Khata assistant. I can help you with managing customers, tracking transactions, understanding your dashboard, generating reports, and general bookkeeping tips. How can I help you today?',
    },
    {
      keywords: ['add customer', 'new customer', 'create customer'],
      response: 'To add a new customer:\n\n1. Go to the **Customers** page from the top navigation.\n2. Click the **"Add customer"** button.\n3. Fill in the customer name, mobile number, and opening balance.\n4. Click **Save**.\n\nYou can also quickly add a customer from the Dashboard using the **Quick Actions** section.',
    },
    {
      keywords: ['add transaction', 'new transaction', 'record payment', 'record sale'],
      response: 'To record a new transaction:\n\n1. Navigate to the **Transactions** page.\n2. Click **"Add transaction"**.\n3. Select the customer, choose **Debit** (customer owes you) or **Credit** (customer paid you), enter the amount, and add a description.\n4. Click **Save**.\n\nYou can also add transactions directly from a customer\'s detail page.',
    },
    {
      keywords: ['debit', 'credit', 'difference'],
      response: '**Debit vs Credit in your Khata:**\n\n- **Debit** = Customer took goods on credit (they owe you money). Their balance increases.\n- **Credit** = Customer made a payment (they paid you). Their balance decreases.\n\nFor example: If Ramesh buys goods worth \u20b9500 on credit, record it as a **Debit of \u20b9500**. When he pays \u20b9200, record it as a **Credit of \u20b9200**. His outstanding balance will be \u20b9300.',
    },
    {
      keywords: ['dashboard', 'overview', 'summary'],
      response: 'Your **Dashboard** shows a quick overview of your business:\n\n- **Total Customers** \u2014 Number of active customers.\n- **Total Debit** \u2014 Total credit given to all customers.\n- **Total Credit** \u2014 Total payments received from all customers.\n- **Outstanding** \u2014 Net amount still owed to you (Debit - Credit).\n\nIt also shows **recent transactions** and **top debtors** (customers who owe you the most).',
    },
    {
      keywords: ['report', 'pdf', 'download', 'statement', 'export'],
      response: 'To generate reports:\n\n1. Go to the **Reports** page.\n2. **All Customers PDF** \u2014 Click "Download all customers" to get a complete list.\n3. **Customer Statement** \u2014 Select a customer, choose a date range, and click "Download" to get their transaction statement as a PDF.\n\nThese PDFs are useful for sharing with customers or for your own records.',
    },
    {
      keywords: ['outstanding', 'balance', 'owe', 'udhar', 'baaki'],
      response: 'To check outstanding balances:\n\n1. Go to **Customers** page \u2014 each customer row shows their current balance.\n2. On the **Dashboard**, check "Total Outstanding" for the overall amount owed to you.\n3. The **Top Debtors** section on the Dashboard shows who owes you the most.\n\nA positive balance means the customer owes you money. You can click on any customer to see their full transaction history.',
    },
    {
      keywords: ['search', 'find customer', 'filter'],
      response: 'You can search for customers on the **Customers** page:\n\n- Use the **search bar** at the top to filter by name or mobile number.\n- Click on column headers (**Name**, **Balance**) to sort ascending or descending.\n- On the **Transactions** page, use the customer dropdown and date range filters to find specific transactions.',
    },
    {
      keywords: ['delete', 'remove', 'erase'],
      response: 'To delete a record:\n\n- **Delete a customer**: Go to Customers, find the customer row, and click the delete icon. Confirm in the dialog.\n- **Delete a transaction**: Go to Transactions (or a customer\'s detail page), find the transaction, and click the delete icon.\n\n**Warning:** Deletion is permanent. The customer\'s balance will be recalculated after deleting a transaction.',
    },
    {
      keywords: ['edit', 'update', 'modify', 'change'],
      response: 'To edit a record:\n\n- **Edit a customer**: On the Customers page, click the edit icon on the customer row. Update the details and save.\n- **Edit a transaction**: On the Transactions page, click the edit icon. You can change the amount, type, or description.\n\nChanges are saved immediately and balances are recalculated.',
    },
    {
      keywords: ['demo', 'skip', 'test', 'sample'],
      response: 'You can use **Demo Mode** to explore the app without a real account:\n\n1. On the login page, click **"Skip \u2014 Try Demo"**.\n2. You\'ll get sample data with 8 customers and 12 transactions.\n3. All features work in demo mode (add, edit, delete) but data is stored only in memory and resets when you refresh.\n\nIt\'s a great way to explore the app before setting up your real account!',
    },
    {
      keywords: ['gst', 'tax', 'invoice'],
      response: 'Currently, Digital Khata Book focuses on tracking credit/debit transactions. GST invoicing and tax calculation features are **planned for a future update**.\n\nFor now, you can add tax amounts in the transaction description field (e.g., "Goods \u20b9500 + GST \u20b990") to keep a note.',
    },
    {
      keywords: ['backup', 'data', 'safe', 'security'],
      response: 'Your data security:\n\n- All data is stored securely on the server with JWT authentication.\n- In **Demo Mode**, data is stored locally in your browser and resets on refresh.\n- For production use, we recommend regular PDF exports from the Reports page as backups.\n\nWe plan to add cloud backup and data export (CSV/Excel) features in future updates.',
    },
    {
      keywords: ['tip', 'advice', 'suggestion', 'best practice'],
      response: 'Here are some bookkeeping tips for your Kirana shop:\n\n1. **Record transactions daily** \u2014 Don\'t let entries pile up.\n2. **Use descriptions** \u2014 Add item details to each transaction for clarity.\n3. **Review outstanding weekly** \u2014 Follow up with top debtors regularly.\n4. **Download statements monthly** \u2014 Keep PDF backups of all transactions.\n5. **Share statements** \u2014 Give customers their statement to avoid disputes.',
    },
    {
      keywords: ['thank', 'thanks', 'dhanyavaad'],
      response: 'You\'re welcome! If you have any more questions about managing your khata, feel free to ask. I\'m here to help!',
    },
    {
      keywords: ['help', 'what can you do', 'features'],
      response: 'I can help you with:\n\n- **Adding customers & transactions** \u2014 Step-by-step guidance\n- **Understanding your dashboard** \u2014 What the numbers mean\n- **Generating reports** \u2014 PDF statements and exports\n- **Searching & filtering** \u2014 Finding specific records\n- **Debit/Credit explained** \u2014 How bookkeeping works\n- **Tips & best practices** \u2014 Better khata management\n- **App features** \u2014 Demo mode, editing, deleting records\n\nJust type your question and I\'ll do my best to help!',
    },
  ];

  private defaultResponse =
    'I\'m not sure I understand that question. Here are some things I can help with:\n\n- How to add customers or transactions\n- Understanding debit vs credit\n- Dashboard and reports guidance\n- Searching and filtering records\n- Tips for managing your khata\n\nTry asking about any of these topics!';

  private mockSession: {
    step: 'name' | 'phone' | 'description';
    name?: string;
    mobile?: string;
    description?: string;
    openingBalance?: number;
  } | null = null;

  private mockTxnSession: {
    step: 'customer' | 'type' | 'amount' | 'description';
    customerName?: string;
    type?: 'DEBIT' | 'CREDIT';
    amount?: number;
    description?: string;
  } | null = null;

  private getMockResponse(input: string): string {
    const lower = input.toLowerCase().trim();

    // 1. Active interactive customer creation session
    if (this.mockSession) {
      if (['cancel', 'exit', 'stop', 'quit', 'abort'].includes(lower)) {
        this.mockSession = null;
        return '❌ Customer creation cancelled. You can type **"create customer"** anytime to start again.';
      }

      if (this.mockSession.step === 'name') {
        const cleanName = input.replace(/^(customer name is|name is|customer name:|name:)/i, '').trim();
        if (!cleanName || /^\d+$/.test(cleanName)) {
          return '⚠️ Please enter a valid customer name (letters and spaces), or type \'cancel\' to exit:';
        }
        this.mockSession.name = cleanName;
        this.mockSession.step = 'phone';
        return `Great! Customer Name: **${cleanName}** 👤\n\nNow, please enter the **Phone Number** (10-digit mobile):`;
      }

      if (this.mockSession.step === 'phone') {
        let digits = input.replace(/\D/g, '');
        if (digits.startsWith('91') && digits.length === 12) {
          digits = digits.substring(2);
        }
        if (digits.length < 7 || digits.length > 15) {
          return '⚠️ Please enter a valid mobile number (7-15 digits, e.g., 9876543210), or type \'cancel\' to exit:';
        }
        this.mockSession.mobile = digits;
        this.mockSession.step = 'description';
        return `Phone Number saved: **${digits}** 📱\n\nNow, please enter a **Description / Note** for **${this.mockSession.name}** (e.g., 'Regular shop customer', opening balance like '500', or type **'skip'**):`;
      }

      if (this.mockSession.step === 'description') {
        const isSkip = ['skip', 'none', 'no', '-', 'na', 'n/a'].includes(lower);
        let desc = 'Created via Assistant';
        let openingBal = 0;

        if (!isSkip) {
          if (/^\d+(\.\d+)?$/.test(input)) {
            openingBal = parseFloat(input);
            desc = `Opening balance: ₹${openingBal}`;
          } else {
            desc = input;
            const match = input.match(/(?:bal|balance|rs|inr|opening)\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
            if (match) {
              openingBal = parseFloat(match[1]);
            }
          }
        }

        const createdName = this.mockSession.name;
        const createdPhone = this.mockSession.mobile;
        this.mockSession = null;

        setTimeout(() => {
          this.apiService.notifyDataChange({ type: 'customer', action: 'create' });
        }, 100);

        return `✅ **Customer Created Successfully!**\n\n• 👤 **Name:** ${createdName}\n• 📱 **Phone:** ${createdPhone}\n• 📝 **Description:** ${desc}\n• 💰 **Opening Balance:** ₹${openingBal.toFixed(2)}`;
      }
    }

    // 2. Active interactive transaction creation session
    if (this.mockTxnSession) {
      if (['cancel', 'exit', 'stop', 'quit', 'abort'].includes(lower)) {
        this.mockTxnSession = null;
        return '❌ Transaction cancelled. You can type **"add transaction"** anytime to start again.';
      }

      if (this.mockTxnSession.step === 'customer') {
        const cleanName = input.replace(/^(customer name is|to|for|from)\s*/i, '').trim();
        if (!cleanName || /^\d+$/.test(cleanName)) {
          return '⚠️ Please enter a valid customer name (e.g., Rahul), or type \'cancel\' to exit:';
        }
        this.mockTxnSession.customerName = cleanName;
        this.mockTxnSession.step = 'type';
        return `Selected customer: **${cleanName}** 👤\n\nWas this money given or received?\n• Reply **1** or **Gave** (Debit / Udhaar)\n• Reply **2** or **Got** (Credit / Payment)\n\n_(Type 'cancel' to abort)_`;
      }

      if (this.mockTxnSession.step === 'type') {
        let type: 'DEBIT' | 'CREDIT' | null = null;
        if (lower === '1' || lower.includes('gave') || lower.includes('give') || lower.includes('debit') || lower.includes('udhaar')) {
          type = 'DEBIT';
        } else if (lower === '2' || lower.includes('got') || lower.includes('credit') || lower.includes('jama') || lower.includes('received') || lower.includes('payment') || lower.includes('paid')) {
          type = 'CREDIT';
        }

        if (!type) {
          return '⚠️ Please select:\n• Reply **1** or **Gave** (Debit / Udhaar)\n• Reply **2** or **Got** (Credit / Payment)\n_(Type \'cancel\' to exit)_';
        }

        this.mockTxnSession.type = type;
        this.mockTxnSession.step = 'amount';
        return `Type selected: **${type === 'DEBIT' ? 'Debit (You Gave / Udhaar)' : 'Credit (You Received / Payment)'}** 💳\n\nNow, please enter the **Amount** in ₹ (e.g. 500):`;
      }

      if (this.mockTxnSession.step === 'amount') {
        const amtMatch = input.match(/(\d+(?:\.\d+)?)/);
        if (!amtMatch) {
          return '⚠️ Please enter a valid amount in numbers (e.g., 500), or type \'cancel\' to exit:';
        }
        const amt = parseFloat(amtMatch[1]);
        if (amt <= 0) {
          return '⚠️ Amount must be greater than zero. Please enter a valid amount:';
        }

        this.mockTxnSession.amount = amt;
        this.mockTxnSession.step = 'description';
        return `Amount: **₹${amt.toFixed(2)}** 💰\n\nNow, please enter a **Description / Note** for this transaction (e.g., 'Groceries bill', or type **'skip'**):`;
      }

      if (this.mockTxnSession.step === 'description') {
        const isSkip = ['skip', 'none', 'no', '-', 'na', 'n/a'].includes(lower);
        const desc = isSkip ? `Recorded via Assistant (${this.mockTxnSession.type === 'DEBIT' ? 'Given' : 'Received'})` : input;
        const cName = this.mockTxnSession.customerName;
        const tType = this.mockTxnSession.type;
        const amt = this.mockTxnSession.amount || 0;
        this.mockTxnSession = null;

        setTimeout(() => {
          this.apiService.notifyDataChange({ type: 'transaction', action: 'create' });
        }, 100);

        return `✅ **Transaction Recorded Successfully!**\n\n• 👤 **Customer:** ${cName}\n• 💳 **Type:** ${tType === 'DEBIT' ? 'Debit (Udhaar / You Gave) 🔴' : 'Credit (Payment / You Received) 🟢'}\n• 💰 **Amount:** ₹${amt.toFixed(2)}\n• 📝 **Description:** ${desc}`;
      }
    }

    // 3. Comma-separated quick customer creation: "ram,232323233,hyd" or "ram, 232323233, hyd, 500"
    if (input.includes(',')) {
      const parts = input.split(',');
      if (parts.length >= 2) {
        const rawName = parts[0].replace(/\b(create|add|new|customer)\b/gi, '').trim();
        let rawPhone = parts[1].trim().replace(/\D/g, '');
        if (rawPhone.startsWith('91') && rawPhone.length === 12) {
          rawPhone = rawPhone.substring(2);
        }
        if (rawName && rawPhone.length >= 7 && rawPhone.length <= 15) {
          let desc = 'Created via Assistant';
          let openingBal = 0;
          if (parts.length >= 3) {
            const p2 = parts[2].trim();
            if (/^\d+(\.\d+)?$/.test(p2)) {
              openingBal = parseFloat(p2);
              desc = `Opening balance: ₹${openingBal.toFixed(2)}`;
            } else {
              desc = p2;
            }
          }
          if (parts.length >= 4) {
            const p3 = parts[3].trim();
            if (/^\d+(\.\d+)?$/.test(p3)) {
              openingBal = parseFloat(p3);
            } else if (desc === 'Created via Assistant') {
              desc = p3;
            } else {
              desc += `, ${p3}`;
            }
          }
          this.mockSession = null;
          setTimeout(() => {
            this.apiService.notifyDataChange({ type: 'customer', action: 'create' });
          }, 100);
          return `✅ **Customer Created Successfully!**\n\n• 👤 **Name:** ${rawName}\n• 📱 **Phone:** ${rawPhone}\n• 📝 **Description:** ${desc}\n• 💰 **Opening Balance:** ₹${openingBal.toFixed(2)}`;
        }
      }
    }

    // 4. Initiate Customer Creation Wizard
    if (
      lower === 'create customer' ||
      lower === 'add customer' ||
      lower === 'new customer' ||
      lower.startsWith('create customer') ||
      lower.startsWith('add customer') ||
      lower.startsWith('new customer')
    ) {
      const phoneMatch = input.match(/\b([6-9]\d{9}|\d{7,15})\b/);
      const mobile = phoneMatch ? phoneMatch[1] : '';
      const textWithoutPhone = mobile ? input.replace(mobile, ' ') : input;
      const cleanName = textWithoutPhone
        .replace(/\b(create|add|new|a|customer|mobile|phone|opening|balance|rs|inr|rupees|description|note)\b/gi, '')
        .replace(/[^a-zA-Z\s]/g, ' ')
        .trim();

      if (cleanName && mobile) {
        setTimeout(() => {
          this.apiService.notifyDataChange({ type: 'customer', action: 'create' });
        }, 100);
        return `✅ **Customer Created Successfully!**\n\n• 👤 **Name:** ${cleanName}\n• 📱 **Phone:** ${mobile}\n• 📝 **Description:** Created via Assistant\n• 💰 **Opening Balance:** ₹0.00`;
      }

      if (cleanName && cleanName.split(' ').length <= 3) {
        this.mockSession = { step: 'phone', name: cleanName };
        return `👤 Creating customer **${cleanName}**.\n\nPlease enter **${cleanName}'s Phone Number** (7-15 digit mobile):\n_(Type 'cancel' anytime to abort)_`;
      }

      this.mockSession = { step: 'name' };
      return '👤 **Create New Customer**\n\nPlease enter the **Customer Name**:\n_(💡 Tip: You can quick-create in one shot: **Name, Phone, Description** e.g. `ram, 232323233, hyd`)_';
    }

    // 5. Shorthand or Wizard Transaction Commands:
    // e.g. "ram1000 debit / credit for milk", "ram 1000 debit for milk", "gave 500 to rahul", "add transaction"
    const normalizedInput = input.replace(/([a-zA-Z])(?=\d)|(\d)(?=[a-zA-Z])/g, '$1 $2');
    const normLower = normalizedInput.toLowerCase();
    const hasTxnAction = normLower.includes('gave') || normLower.includes('give') || normLower.includes('debit') ||
                         normLower.includes('got') || normLower.includes('credit') || normLower.includes('jama') ||
                         normLower.includes('payment') || normLower.includes('udhaar') || normLower.includes('paid');

    if (
      lower === 'add transaction' ||
      lower === 'new transaction' ||
      lower === 'create transaction' ||
      lower === 'record transaction' ||
      lower.startsWith('add transaction') ||
      lower.startsWith('new transaction') ||
      lower.startsWith('create transaction') ||
      lower.startsWith('record transaction') ||
      (hasTxnAction && !normLower.includes('customer'))
    ) {
      const amtMatch = normalizedInput.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)/i);
      const isDebit = /\b(debit|debits|gave|give|udhaar|borrowed)\b/i.test(normLower);
      const isCredit = /\b(credit|credits|got|received|jama|paid|payment)\b/i.test(normLower);
      let type: 'DEBIT' | 'CREDIT' = 'DEBIT';
      if (isDebit && isCredit) {
        const idxDebit = normLower.indexOf('debit');
        const idxCredit = normLower.indexOf('credit');
        type = (idxDebit !== -1 && (idxCredit === -1 || idxDebit < idxCredit)) ? 'DEBIT' : 'CREDIT';
      } else if (isCredit) {
        type = 'CREDIT';
      }

      let text = normalizedInput;
      if (amtMatch) {
        text = text.replace(amtMatch[0], ' ');
      }

      let description = '';
      let targetName = '';

      const forMatch = text.match(/\bfor\s+([a-zA-Z0-9\s&/,-]+)/i);
      if (forMatch) {
        description = forMatch[1].trim();
        text = text.replace(forMatch[0], ' ');
      }

      const toFromMatch = text.match(/\b(?:to|from)\s+([a-zA-Z0-9\s]+)/i);
      if (toFromMatch) {
        targetName = toFromMatch[1].trim();
        text = text.replace(toFromMatch[0], ' ');
      }

      const cleaned = text
        .replace(/\b(gave|give|got|received|payment|udhaar|jama|credit|credits|debit|debits|add|new|create|record|transaction|transactions|rs|inr|rupees|amount)\b/gi, ' ')
        .replace(/[/\\&]/g, ' ')
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (!targetName && cleaned) {
        const words = cleaned.split(/\s+/);
        if (!description && words.length > 1) {
          targetName = words[0];
          description = words.slice(1).join(' ');
        } else {
          targetName = words[0];
        }
      }

      if (targetName && amtMatch) {
        this.mockTxnSession = null;
        setTimeout(() => {
          this.apiService.notifyDataChange({ type: 'transaction', action: 'create' });
        }, 100);
        const finalDesc = description || `Recorded via Assistant (${type === 'DEBIT' ? 'Given' : 'Received'})`;
        return `✅ **Transaction Recorded Successfully!**\n\n• 👤 **Customer:** ${targetName}\n• 💳 **Type:** ${type === 'DEBIT' ? 'Debit (Udhaar / You Gave) 🔴' : 'Credit (Payment / You Received) 🟢'}\n• 💰 **Amount:** ₹${parseFloat(amtMatch[1]).toFixed(2)}\n• 📝 **Description:** ${finalDesc}`;
      }

      if (targetName) {
        this.mockTxnSession = { step: 'type', customerName: targetName };
        return `Selected customer: **${targetName}** 👤\n\nWas this money given or received?\n• Reply **1** or **Gave** (Debit / Udhaar)\n• Reply **2** or **Got** (Credit / Payment)\n\n_(Type 'cancel' to abort)_`;
      }

      this.mockTxnSession = { step: 'customer' };
      return '💸 **Record New Transaction**\n\nWho is this transaction for?\nPlease enter the **Customer Name**:\n_(Type \'cancel\' anytime to abort)_';
    }

    let bestMatch: { response: string; matchCount: number } | null = null;
    for (const entry of this.mockResponses) {
      const matchCount = entry.keywords.filter(kw => lower.includes(kw)).length;
      if (matchCount > 0 && (!bestMatch || matchCount > bestMatch.matchCount)) {
        bestMatch = { response: entry.response, matchCount };
      }
    }
    return bestMatch ? bestMatch.response : this.defaultResponse;
  }

  private generateId(): string {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }
}
