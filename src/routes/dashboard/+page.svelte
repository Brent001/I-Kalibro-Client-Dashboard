<script lang="ts">
  import Layout from "$lib/components/ui/layout.svelte";
  import { page } from "$app/stores";

  // Use data from server
  $: user = $page.data?.user;
  $: myBooks = $page.data?.myBooks ?? [];
  $: myReservations = $page.data?.myReservations ?? [];
  $: recentActivity = $page.data?.recentActivity ?? [];
  $: penalties = $page.data?.penalties ?? [];

  // Calculate stats
  $: currentBooksCount = myBooks.filter(book => book.status === 'borrowed' || book.status === 'active').length;
  $: overdueCount = myBooks.filter(book => book.status === 'overdue').length;
  $: reservationsCount = myReservations.length;
  $: unpaidPenalties = penalties.filter(p => p.status === 'unpaid' || p.status === 'overdue');
  $: totalUnpaidAmount = unpaidPenalties.reduce((sum, p) => sum + (p.fine || p.amount || 0), 0);

  function getStatusColor(status: string) {
    switch (status) {
      case 'overdue': return 'text-red-600 bg-red-50';
      case 'due-soon': return 'text-orange-600 bg-orange-50';
      case 'borrowed':
      case 'active': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  }

  function getDaysLeftStatus(daysLeft: number) {
    if (daysLeft < 0) return 'overdue';
    if (daysLeft <= 3) return 'due-soon';
    return 'active';
  }

  function formatCurrency(amount: number) {
    return `₱${amount.toFixed(2)}`;
  }
</script>

<Layout>
  <div class="space-y-4 sm:space-y-6">
    <!-- Compact Welcome Section -->
    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-3 flex items-center space-x-3 mb-2">
      <div class="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center">
        <svg class="h-6 w-6 text-slate-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
        </svg>
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-gray-900 text-base truncate">
          Welcome, {user?.name || 'Student'}
        </div>
        <div class="text-xs text-gray-500 truncate">
          {user?.role === 'student' ? user?.course || 'Student' : user?.department || 'Faculty'}
          {#if user?.enrollmentNo}
            &nbsp;|&nbsp;ID: {user.enrollmentNo}
          {/if}
        </div>
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <div class="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div class="text-center">
          <div class="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2">
            <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
          <p class="text-lg sm:text-2xl font-bold text-gray-900">{currentBooksCount}</p>
          <p class="text-xs sm:text-sm text-gray-600">Current Books</p>
        </div>
      </div>
      
      <div class="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div class="text-center">
          <div class="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center mx-auto mb-2">
            <svg class="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18v.75a3.75 3.75 0 11-7.5 0V18M8.25 7.5A2.25 2.25 0 016 9.75v.375a2.25 2.25 0 002.25 2.25h3.375a2.25 2.25 0 002.25-2.25V9.75a2.25 2.25 0 00-2.25-2.25H8.25z"/>
            </svg>
          </div>
          <p class="text-lg sm:text-2xl font-bold text-gray-900">{reservationsCount}</p>
          <p class="text-xs sm:text-sm text-gray-600">Reservations</p>
        </div>
      </div>
      
      <div class="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div class="text-center">
          <div class="w-8 h-8 {overdueCount > 0 ? 'bg-red-50' : 'bg-green-50'} rounded-lg flex items-center justify-center mx-auto mb-2">
            <svg class="h-5 w-5 {overdueCount > 0 ? 'text-red-600' : 'text-green-600'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"/>
            </svg>
          </div>
          <p class="text-lg sm:text-2xl font-bold {overdueCount > 0 ? 'text-red-600' : 'text-green-600'}">{overdueCount}</p>
          <p class="text-xs sm:text-sm text-gray-600">Overdue Books</p>
        </div>
      </div>
      
      <div class="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200">
        <div class="text-center">
          <div class="w-8 h-8 {totalUnpaidAmount > 0 ? 'bg-orange-50' : 'bg-green-50'} rounded-lg flex items-center justify-center mx-auto mb-2">
            <svg class="h-5 w-5 {totalUnpaidAmount > 0 ? 'text-orange-600' : 'text-green-600'}" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p class="text-lg sm:text-2xl font-bold {totalUnpaidAmount > 0 ? 'text-orange-600' : 'text-green-600'}">
            {formatCurrency(totalUnpaidAmount)}
          </p>
          <p class="text-xs sm:text-sm text-gray-600">Pending Fines</p>
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3">
      <!-- My Current Books -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-base sm:text-lg font-semibold text-gray-900">My Current Books</h3>
          <svg class="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        </div>
        <div class="divide-y divide-gray-100">
          {#each myBooks as book}
            <div class="p-3 sm:p-4 hover:bg-gray-50 transition-colors duration-150">
              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 {getDaysLeftStatus(book.daysLeft) === 'overdue' ? 'bg-red-500' : getDaysLeftStatus(book.daysLeft) === 'due-soon' ? 'bg-orange-500' : 'bg-green-500'} rounded-full mt-2 flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate sm:whitespace-normal">{book.title}</p>
                  <p class="text-xs sm:text-sm text-gray-600 mt-1">by {book.author}</p>
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 space-y-2 sm:space-y-0">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {getStatusColor(getDaysLeftStatus(book.daysLeft))} w-fit">
                      {#if book.daysLeft < 0}
                        {Math.abs(book.daysLeft)} days overdue
                      {:else if book.daysLeft <= 3}
                        Due in {book.daysLeft} days
                      {:else}
                        {book.daysLeft} days left
                      {/if}
                    </span>
                    <span class="text-xs text-gray-500 flex-shrink-0">Due: {book.dueDate}</span>
                  </div>
                </div>
              </div>
            </div>
          {/each}
          {#if myBooks.length === 0}
            <div class="p-6 text-center text-gray-500">
              <svg class="h-12 w-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              <p class="text-sm">No books borrowed yet</p>
            </div>
          {/if}
        </div>
      </div>

      <!-- My Reservations -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-base sm:text-lg font-semibold text-gray-900">My Reservations</h3>
          <svg class="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18v.75a3.75 3.75 0 11-7.5 0V18M8.25 7.5A2.25 2.25 0 016 9.75v.375a2.25 2.25 0 002.25 2.25h3.375a2.25 2.25 0 002.25-2.25V9.75a2.25 2.25 0 00-2.25-2.25H8.25z"/>
          </svg>
        </div>
        <div class="divide-y divide-gray-100">
          {#each myReservations as reservation}
            <div class="p-3 sm:p-4 hover:bg-gray-50 transition-colors duration-150">
              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 truncate sm:whitespace-normal">{reservation.title}</p>
                  <p class="text-xs sm:text-sm text-gray-600 mt-1">by {reservation.author}</p>
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 space-y-2 sm:space-y-0">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 w-fit">
                      Position #{reservation.queuePosition} in queue
                    </span>
                    <span class="text-xs text-gray-500 flex-shrink-0">Est: {reservation.estimatedDate}</span>
                  </div>
                </div>
              </div>
            </div>
          {/each}
          {#if myReservations.length === 0}
            <div class="p-6 text-center text-gray-500">
              <svg class="h-12 w-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18v.75a3.75 3.75 0 11-7.5 0V18M8.25 7.5A2.25 2.25 0 016 9.75v.375a2.25 2.25 0 002.25 2.25h3.375a2.25 2.25 0 002.25-2.25V9.75a2.25 2.25 0 00-2.25-2.25H8.25z"/>
              </svg>
              <p class="text-sm">No active reservations</p>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Bottom Row -->
    <div class="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-3">
      <!-- Recent Activity -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-base sm:text-lg font-semibold text-gray-900">Recent Activity</h3>
          <svg class="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
          </svg>
        </div>
        <div class="divide-y divide-gray-100">
          {#each recentActivity as activity}
            <div class="p-3 sm:p-4 hover:bg-gray-50 transition-colors duration-150">
              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 {activity.type === 'borrow' ? 'bg-blue-500' : activity.type === 'return' ? 'bg-green-500' : activity.type === 'reserve' ? 'bg-purple-500' : 'bg-orange-500'} rounded-full mt-2 flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900">
                    <span class="{activity.type === 'borrow' ? 'text-blue-600' : activity.type === 'return' ? 'text-green-600' : activity.type === 'reserve' ? 'text-purple-600' : 'text-orange-600'}">{activity.action}</span>
                    {activity.book}
                  </p>
                  <p class="text-xs text-gray-500 mt-1">{activity.date}</p>
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Penalties & Fines -->
      <div class="bg-white rounded-lg shadow-sm border border-gray-200">
        <div class="p-4 sm:p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 class="text-base sm:text-lg font-semibold text-gray-900">Penalties & Fines</h3>
          <svg class="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <div class="divide-y divide-gray-100">
          {#each penalties as penalty}
            <div class="p-3 sm:p-4 hover:bg-gray-50 transition-colors duration-150">
              <div class="flex items-start space-x-3">
                <div class="w-2 h-2 {penalty.status === 'unpaid' ? 'bg-red-500' : 'bg-green-500'} rounded-full mt-2 flex-shrink-0"></div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900">{penalty.type}</p>
                  <p class="text-xs sm:text-sm text-gray-600 mt-1">{penalty.book}</p>
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-2 space-y-2 sm:space-y-0">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {penalty.status === 'unpaid' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} w-fit">
                      {penalty.status === 'unpaid' ? 'Unpaid' : 'Paid'}
                    </span>
                    <span class="text-sm font-semibold text-gray-900">{formatCurrency(penalty.amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          {/each}
          {#if penalties.length === 0}
            <div class="p-6 text-center text-gray-500">
              <svg class="h-12 w-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p class="text-sm">No penalties or fines</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</Layout>