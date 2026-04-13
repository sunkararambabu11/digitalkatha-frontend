import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../layout/layout.component';
import { AiChatService, ChatMessage } from '../../services/ai-chat.service';

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  templateUrl: './ai-chat.component.html',
  styleUrls: ['./ai-chat.component.css'],
})
export class AiChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  messages: ChatMessage[] = [];
  inputMessage: string = '';
  isLoading: boolean = false;
  private shouldScroll: boolean = false;

  /** Quick suggestion chips shown when conversation is empty */
  suggestions: string[] = [
    'How do I add a customer?',
    'What is debit vs credit?',
    'How to download reports?',
    'Show me tips for my shop',
    'What can you help me with?',
    'How does demo mode work?',
  ];

  constructor(private aiChatService: AiChatService) {}

  ngOnInit(): void {
    this.messages = this.aiChatService.getConversationHistory();
    if (this.messages.length === 0) {
      // Add a welcome message
      const welcome: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content:
          'Welcome to **Digital Khata Assistant**! I can help you with managing customers, recording transactions, understanding your dashboard, and more. Ask me anything or pick a suggestion below.',
        timestamp: new Date(),
      };
      this.messages.push(welcome);
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  sendMessage(): void {
    const text = this.inputMessage.trim();
    if (!text || this.isLoading) return;

    this.inputMessage = '';
    this.isLoading = true;
    this.shouldScroll = true;

    this.aiChatService.sendMessage(text).subscribe({
      next: (response) => {
        this.messages = this.aiChatService.getConversationHistory();
        // Prepend the welcome message if it was there
        if (this.messages.length > 0 && this.messages[0].id !== 'welcome') {
          const welcome: ChatMessage = {
            id: 'welcome',
            role: 'assistant',
            content:
              'Welcome to **Digital Khata Assistant**! I can help you with managing customers, recording transactions, understanding your dashboard, and more. Ask me anything or pick a suggestion below.',
            timestamp: new Date(),
          };
          this.messages = [welcome, ...this.messages];
        }
        this.isLoading = false;
        this.shouldScroll = true;
        this.focusInput();
      },
      error: () => {
        this.isLoading = false;
        this.focusInput();
      },
    });
  }

  useSuggestion(text: string): void {
    this.inputMessage = text;
    this.sendMessage();
  }

  clearChat(): void {
    this.aiChatService.clearConversation();
    this.messages = [];
    const welcome: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content:
        'Welcome to **Digital Khata Assistant**! I can help you with managing customers, recording transactions, understanding your dashboard, and more. Ask me anything or pick a suggestion below.',
      timestamp: new Date(),
    };
    this.messages.push(welcome);
    this.focusInput();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Simple markdown-like formatting for bold and newlines.
   * Replace **text** with <strong>text</strong> and \n with <br>.
   */
  formatContent(content: string): string {
    let formatted = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Bold
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    // Bullet points (lines starting with "- ")
    formatted = formatted.replace(
      /(?:^|<br>)- (.+?)(?=<br>|$)/g,
      '<br>&nbsp;&nbsp;\u2022 $1'
    );
    // Numbered lists
    formatted = formatted.replace(
      /(?:^|<br>)(\d+)\. (.+?)(?=<br>|$)/g,
      '<br>&nbsp;&nbsp;$1. $2'
    );
    return formatted;
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    } catch (_) {}
  }

  trackByMsgId(index: number, msg: ChatMessage): string {
    return msg.id;
  }

  private focusInput(): void {
    setTimeout(() => {
      this.messageInput?.nativeElement?.focus();
    }, 50);
  }
}
