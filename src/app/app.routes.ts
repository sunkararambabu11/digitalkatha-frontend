import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';

export const routes: Routes = [
    {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
    },
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'customers',
                children: [
                    {
                        path: '',
                        loadComponent: () => import('./features/customers/list/customer-list.component').then(m => m.CustomerListComponent)
                    },
                    {
                        path: 'add',
                        loadComponent: () => import('./features/customers/add/customer-add.component').then(m => m.CustomerAddComponent)
                    },
                    {
                        path: ':id',
                        loadComponent: () => import('./features/customers/view/customer-view.component').then(m => m.CustomerViewComponent)
                    },
                    {
                        path: ':id/ledger',
                        loadComponent: () => import('./features/customers/ledger/customer-ledger.component').then(m => m.CustomerLedgerComponent)
                    }
                ]
            },
            {
                path: 'reports',
                loadComponent: () => import('./features/reports/reports.component').then(m => m.ReportsComponent)
            }
        ]
    },
    { path: '**', redirectTo: 'login' }
];
