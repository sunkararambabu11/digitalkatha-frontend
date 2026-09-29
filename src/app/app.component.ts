import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './components/toast/toast.component';
import { ChatWidgetComponent } from './components/chat-widget/chat-widget.component';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, ChatWidgetComponent],
  template: '<router-outlet></router-outlet><app-toast></app-toast><app-chat-widget></app-chat-widget>',
  styles: []
})
export class AppComponent {
  title = 'Digital Khata Book';

  constructor(private themeService: ThemeService) {}
}

