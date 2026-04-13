import {
  Component, OnInit, ViewChild, ElementRef,
  AfterViewChecked, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiChatService, ChatMessage, Conversation } from '../../services/ai-chat.service';
import { AuthService } from '../../services/auth.service';

type WidgetView = 'closed' | 'chat' | 'expanded';
type PanelView = 'messages' | 'history';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrls: ['./chat-widget.component.css'],
})
export class ChatWidgetComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  /* ── State ── */
  widgetView: WidgetView = 'closed';
  panelView: PanelView = 'messages';
  isLoading = false;
  inputMessage = '';
  showScrollBtn = false;
  showTeaser = false;
  historySearch = '';
  deleteConfirmId: string | null = null;

  /* ── Data ── */
  messages: ChatMessage[] = [];
  conversations: Conversation[] = [];
  activeConversation: Conversation | null = null;

  /* ── Suggestions ── */
  suggestions: string[] = [
    'How do I add a customer?',
    'What is debit vs credit?',
    'How to download reports?',
    'Show me tips for my shop',
    'What can you help me with?',
    'How does demo mode work?',
  ];

  private shouldScroll = false;
  private teaserTimeout: any;

  constructor(
    private chatService: AiChatService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    // Show proactive teaser after 8s if user hasn't seen welcome
    if (!this.chatService.hasSeenWelcome()) {
      this.teaserTimeout = setTimeout(() => {
        if (this.widgetView === 'closed' && this.authService.isLoggedIn()) {
          this.showTeaser = true;
        }
      }, 8000);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  /** Only show widget when user is logged in */
  get isVisible(): boolean {
    return this.authService.isLoggedIn();
  }

  get greeting(): string {
    return this.chatService.getGreeting();
  }

  /* ────────────────────────────────────────
     Widget open / close / expand
     ──────────────────────────────────────── */

  toggleWidget(): void {
    if (this.widgetView === 'closed') {
      this.openWidget();
    } else {
      this.closeWidget();
    }
  }

  openWidget(): void {
    this.widgetView = 'chat';
    this.panelView = 'messages';
    this.showTeaser = false;
    this.chatService.markWelcomeSeen();
    this.loadActiveConversation();
    this.shouldScroll = true;
    setTimeout(() => this.focusInput(), 200);
  }

  closeWidget(): void {
    this.widgetView = 'closed';
    this.deleteConfirmId = null;
  }

  expandWidget(): void {
    this.widgetView = 'expanded';
    this.loadConversations();
    this.shouldScroll = true;
    setTimeout(() => this.focusInput(), 200);
  }

  collapseWidget(): void {
    this.widgetView = 'chat';
    this.shouldScroll = true;
    setTimeout(() => this.focusInput(), 200);
  }

  dismissTeaser(): void {
    this.showTeaser = false;
    this.chatService.markWelcomeSeen();
  }

  /* ────────────────────────────────────────
     Panel switching (messages vs history)
     ──────────────────────────────────────── */

  showHistory(): void {
    this.panelView = 'history';
    this.historySearch = '';
    this.deleteConfirmId = null;
    this.loadConversations();
  }

  showMessages(): void {
    this.panelView = 'messages';
    this.shouldScroll = true;
    setTimeout(() => this.focusInput(), 100);
  }

  /* ────────────────────────────────────────
     Conversations
     ──────────────────────────────────────── */

  loadConversations(): void {
    this.conversations = this.chatService.getConversations();
  }

  loadActiveConversation(): void {
    this.activeConversation = this.chatService.getActiveConversation();
    if (this.activeConversation) {
      this.messages = [...this.activeConversation.messages];
    } else {
      this.messages = [];
    }
  }

  startNewChat(): void {
    this.chatService.createConversation();
    this.loadActiveConversation();
    this.panelView = 'messages';
    this.shouldScroll = true;
    this.loadConversations();
    setTimeout(() => this.focusInput(), 100);
  }

  selectConversation(conv: Conversation): void {
    this.chatService.setActiveConversation(conv.id);
    this.loadActiveConversation();
    this.panelView = 'messages';
    this.shouldScroll = true;
    setTimeout(() => this.focusInput(), 100);
  }

  confirmDeleteConversation(convId: string, event: Event): void {
    event.stopPropagation();
    this.deleteConfirmId = convId;
  }

  deleteConversation(convId: string, event: Event): void {
    event.stopPropagation();
    this.chatService.deleteConversation(convId);
    this.deleteConfirmId = null;
    this.loadConversations();
    this.loadActiveConversation();
  }

  cancelDelete(event: Event): void {
    event.stopPropagation();
    this.deleteConfirmId = null;
  }

  get filteredConversations(): Conversation[] {
    if (!this.historySearch.trim()) return this.conversations;
    return this.chatService.searchConversations(this.historySearch);
  }

  /* ────────────────────────────────────────
     Messaging
     ──────────────────────────────────────── */

  sendMessage(): void {
    const text = this.inputMessage.trim();
    if (!text || this.isLoading) return;

    this.inputMessage = '';
    this.isLoading = true;
    this.shouldScroll = true;

    // Ensure we have a conversation
    this.chatService.ensureActiveConversation();
    this.loadActiveConversation();

    this.chatService.sendMessage(text).subscribe({
      next: () => {
        this.loadActiveConversation();
        this.isLoading = false;
        this.shouldScroll = true;
        this.loadConversations();
        this.focusInput();
      },
      error: () => {
        this.isLoading = false;
        this.focusInput();
      },
    });

    // Immediately show the user message
    this.loadActiveConversation();
  }

  useSuggestion(text: string): void {
    this.inputMessage = text;
    this.sendMessage();
  }

  clearCurrentChat(): void {
    if (this.activeConversation) {
      this.chatService.deleteConversation(this.activeConversation.id);
      this.chatService.createConversation();
      this.loadActiveConversation();
      this.loadConversations();
    }
  }

  /* ────────────────────────────────────────
     Input handling
     ──────────────────────────────────────── */

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.widgetView === 'expanded') {
      this.collapseWidget();
    } else if (this.widgetView === 'chat') {
      this.closeWidget();
    }
  }

  /* ────────────────────────────────────────
     Scroll handling
     ──────────────────────────────────────── */

  onMessagesScroll(): void {
    const el = this.messagesContainer?.nativeElement;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.showScrollBtn = distFromBottom > 80;
  }

  scrollToBottomClick(): void {
    this.scrollToBottom();
    this.showScrollBtn = false;
  }

  /* ────────────────────────────────────────
     Formatting helpers
     ──────────────────────────────────────── */

  formatTime(ts: string): string {
    return this.chatService.formatTime(ts);
  }

  formatRelative(ts: string): string {
    return this.chatService.formatRelativeTime(ts);
  }

  formatContent(content: string): string {
    return this.chatService.formatContent(content);
  }

  getConvPreview(conv: Conversation): string {
    if (conv.messages.length === 0) return 'No messages yet';
    const last = conv.messages[conv.messages.length - 1];
    const prefix = last.role === 'assistant' ? 'AI: ' : 'You: ';
    const text = last.content.substring(0, 60);
    return prefix + (last.content.length > 60 ? text + '...' : text);
  }

  trackByMsgId(_: number, msg: ChatMessage): string {
    return msg.id;
  }

  trackByConvId(_: number, conv: Conversation): string {
    return conv.id;
  }

  copyMessage(content: string): void {
    navigator.clipboard.writeText(content).catch(() => {});
  }

  /* ────────────────────────────────────────
     Private
     ──────────────────────────────────────── */

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch (_) {}
  }

  private focusInput(): void {
    setTimeout(() => this.messageInput?.nativeElement?.focus(), 50);
  }

  ngOnDestroy(): void {
    if (this.teaserTimeout) clearTimeout(this.teaserTimeout);
  }
}
