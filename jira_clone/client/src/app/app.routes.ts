import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { AboutComponent } from './pages/about/about.component';
import { ContactComponent } from './pages/contact/contact.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';

// Master Admin
import { MasterLayoutComponent } from './users/master/master-layout/master-layout.component';
import { MasterDashboardComponent } from './users/master/master-dashboard/master-dashboard.component';
import { OrganizationsComponent } from './users/master/organizations/organizations.component';
import { GlobalUsersComponent } from './users/master/global-users/global-users.component';
import { SubscriptionPlansComponent } from './users/master/subscription-plans/subscription-plans.component';
import { FinanceBillingComponent } from './users/master/finance-billing/finance-billing.component';
import { PlatformAnalyticsComponent } from './users/master/platform-analytics/platform-analytics.component';
import { ActivityLogsComponent } from './users/master/activity-logs/activity-logs.component';
import { SupportTicketsComponent } from './users/master/support-tickets/support-tickets.component';
import { ConnectComponent} from './users/master/connect/connect.component';

// Admin
import { AdminLayoutComponent } from './users/admin/admin-layout/admin-layout.component';
import { AdminDashboardComponent } from './users/admin/admin-dashboard/admin-dashboard.component';
import { ProjectsComponent } from './users/admin/projects/projects.component';
import { UsersComponent } from './users/admin/users/users.component';
import { IssuesComponent } from './users/admin/issues/issues.component';
import { IssueTypesComponent } from './users/admin/issue-types/issue-types.component';
import { TicketComponent } from './users/admin/ticket/ticket.component';

// QA
import { QaLayoutComponent } from './users/qa/qa-layout/qa-layout.component';
import { QaDashboardComponent } from './users/qa/qa-dashboard/qa-dashboard.component';
import { MyBugsComponent } from './users/qa/my-bugs/my-bugs.component';
import { ReportBugComponent } from './users/qa/report-bug/report-bug.component';
import { TestExecutionComponent } from './users/qa/test-execution/test-execution.component';


// Developer
import { DevLayoutComponent } from './users/dev/dev-layout/dev-layout.component';
import { DevDashboardComponent } from './users/dev/dev-dashboard/dev-dashboard.component';
import { DevMyBugsComponent } from './users/dev/dev-my-bugs/dev-my-bugs.component';


//project-manager
import { ProjectManagerLayoutComponent } from './users/project-manager/project-manager-layout/project-manager-layout.component';
import { PmDashboardComponent } from './users/project-manager/pm-dashboard/pm-dashboard.component';
import { ProjectsListComponent } from './users/project-manager/projects-list/projects-list.component';
import { ProjectBoardComponent } from './users/project-manager/project-board/project-board.component';
import { CreateTaskComponent } from './users/project-manager/create-task/create-task.component';
import { TaskDetailComponent } from './users/project-manager/task-detail/task-detail.component';
import { ProfileComponent } from './pages/profile/profile.component';


export const routes: Routes = [
  //--------------- Public Pages -------------
  { path: 'home', component: HomeComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'about', component: AboutComponent },
  { path: 'contact', component: ContactComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'profile' , component: ProfileComponent},

  //--------------- Admin Section -------------
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'projects', component: ProjectsComponent },
      { path: 'users', component: UsersComponent },
      { path: 'issues', component: IssuesComponent },
      { path: 'ticket', component: TicketComponent },
      { path: 'issue-types', component: IssueTypesComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  //--------------- QA Section with Layout -------------
  {
  path: 'qa',
  component: QaLayoutComponent,
    children: [
      { path: 'dashboard', component: QaDashboardComponent },
      { path: 'my-bugs', component: MyBugsComponent },
      { path: 'report-bug', component: ReportBugComponent },
      { path: 'test-execution', component: TestExecutionComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  
//--------------- Developer Section with Layout -------------

{

path: 'dev',
    component: DevLayoutComponent,
    children: [
      { path: 'dashboard', component: DevDashboardComponent },
      { path: 'my-bugs', component: DevMyBugsComponent }, // New route
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
]
},

// Project Manager Portal
{
  path: 'project-manager',
  component: ProjectManagerLayoutComponent,
  children: [
    { path: 'dashboard', component: PmDashboardComponent },
    { path: 'projects', component: ProjectsListComponent },
    { path: 'board', component: ProjectBoardComponent },
    { path: 'create-task', component: CreateTaskComponent },
    { path: 'task/:id', component: TaskDetailComponent },
    { path: 'connect', component: ConnectComponent },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
  ]
},

//--------------- Master Admin Section -------------
{
  path: 'master',
  component: MasterLayoutComponent,
  children: [
    { path: 'dashboard', component: MasterDashboardComponent },
    { path: 'organizations', component: OrganizationsComponent },
    { path: 'users', component: GlobalUsersComponent },
    { path: 'plans', component: SubscriptionPlansComponent },
    { path: 'finance', component: FinanceBillingComponent },
    { path: 'analytics', component: PlatformAnalyticsComponent },
    { path: 'activity', component: ActivityLogsComponent },
    { path: 'connect', component: ConnectComponent },   // ✅ FIXED
    { path: 'support', component: SupportTicketsComponent },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
  ]
}

  
];