<template>
  <div class="flex flex-col h-full bg-surface-canvas">
    <div class="p-inline-lg py-stack-lg border-b border-border-muted bg-surface no-print">
      <div class="max-w-6xl mx-auto">
        <h1 class="text-h1 font-semibold text-ink">Professional Development</h1>
        <p class="mt-2 text-body text-ink-muted">Review your private reflections, learning themes and professional development over time.</p>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-inline-lg py-stack-lg no-print">
      <div class="max-w-6xl mx-auto">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div class="flex items-center gap-4">
            <h2 class="text-h2 font-semibold text-ink">
              <span v-if="activeView === 'timeline'">Timeline</span>
              <span v-else-if="activeView === 'insights'">Insights</span>
              <span v-else-if="activeView === 'pack'">Supervision Pack</span>
            </h2>
            <div class="flex bg-surface-subtle p-1 rounded-pill border border-border-muted">
              <button 
                @click="activeView = 'timeline'"
                class="px-4 py-1 text-overline font-bold rounded-pill transition-all"
                :class="activeView === 'timeline' ? 'bg-surface text-state-selected shadow-sm' : 'text-ink-muted hover:text-ink'"
              >
                Timeline
              </button>
              <button 
                @click="activeView = 'insights'"
                class="px-4 py-1 text-overline font-bold rounded-pill transition-all"
                :class="activeView === 'insights' ? 'bg-surface text-state-selected shadow-sm' : 'text-ink-muted hover:text-ink'"
              >
                Insights
              </button>
              <button 
                @click="activeView = 'pack'"
                class="px-4 py-1 text-overline font-bold rounded-pill transition-all"
                :class="activeView === 'pack' ? 'bg-surface text-state-selected shadow-sm' : 'text-ink-muted hover:text-ink'"
              >
                Pack
              </button>
            </div>
          </div>

          <div v-if="activeView === 'timeline'" class="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div class="relative w-full md:w-64 order-first md:order-none">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted">🔍</span>
              <input 
                id="reflection-search"
                type="text" 
                v-model="searchQuery" 
                placeholder="Search reflections..."
                class="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-control text-body-sm focus:ring-2 focus:ring-state-selected/20 focus:border-state-selected outline-none transition-all"
              />
            </div>
            
            <div class="relative w-full md:w-48">
              <select 
                v-model="selectedTheme"
                class="w-full px-3 py-2 bg-surface border border-border rounded-control text-body-sm focus:ring-2 focus:ring-state-selected/20 focus:border-state-selected outline-none appearance-none cursor-pointer"
              >
                <option v-for="theme in themes" :key="theme.name" :value="theme.name">
                  {{ theme.name }} ({{ theme.count }})
                </option>
              </select>
              <span class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted">▼</span>
            </div>
          </div>
        </div>

        <div v-if="activeView === 'pack'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-state-info-surface p-6 rounded-panel border border-state-info/20 shadow-sm">
            <div class="flex items-start gap-4">
              <span class="text-2xl mt-0.5">🔒</span>
              <div>
                <h3 class="text-body font-bold text-ink">Supervision Pack</h3>
                <p class="text-body-sm text-ink-secondary mt-1 max-w-2xl">
                  Review and anonymise all material before sharing outside Helios. These reflections are selected for your next supervision session.
                </p>
                <p class="text-caption text-state-info font-medium mt-2">
                  {{ supervisionPackReflections.length }} item{{ supervisionPackReflections.length === 1 ? '' : 's' }} selected
                </p>
              </div>
            </div>
            <button 
              v-if="supervisionPackReflections.length > 0"
              @click="openExportPreview"
              class="px-6 py-2.5 bg-state-selected text-white text-body-sm font-bold rounded-pill hover:bg-state-selected-hover transition-all shadow-md flex items-center justify-center gap-2 shrink-0"
            >
              <span>📄</span>
              Export Pack
            </button>
          </div>

          <div v-if="supervisionPackReflections.length === 0" class="py-stack-xl text-center bg-surface-elevated border border-border-muted rounded-panel shadow-sm">
            <p class="text-body text-ink-subtle italic">Your Supervision Pack is empty.</p>
            <p class="text-caption text-ink-muted mt-2">Select "Include in Pack" on reflections in the Timeline or Session Workspace.</p>
          </div>

          <div v-else class="space-y-4">
            <div
              v-for="reflection in supervisionPackReflections"
              :key="'pack-' + reflection.id"
              class="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-elevated border border-border-muted rounded-panel shadow-sm hover:border-state-selected/50 transition-all"
            >
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-2">
                  <span class="text-caption font-bold text-ink-secondary uppercase tracking-wider">
                    {{ formatDate(reflection.created_at) }}
                  </span>
                  <span v-if="reflection.theme" class="px-2 py-1 bg-surface-subtle text-caption font-bold text-ink-secondary uppercase rounded-full border border-border truncate max-w-[150px]">
                    {{ reflection.theme }}
                  </span>
                </div>

                <div v-if="reflection.clients?.display_name" class="flex items-center gap-1.5 text-body-sm text-ink font-semibold mb-2">
                  <span class="text-xs">👤</span>
                  {{ reflection.clients.display_name }}
                </div>

                <p class="text-body-sm text-ink-secondary line-clamp-2 italic leading-relaxed">
                  "{{ reflection.body || 'No content' }}"
                </p>
              </div>

              <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <button
                  @click="openDetail(reflection)"
                  class="px-3 py-1.5 text-body-sm text-state-selected font-medium hover:underline"
                >
                  View Details
                </button>
                <button
                  @click="toggleSupervision(reflection)"
                  :disabled="actionLoading === reflection.id"
                  class="px-3 py-1.5 text-body-sm text-state-danger font-medium hover:bg-state-danger-surface rounded-control transition-colors flex items-center gap-2"
                >
                  <span v-if="actionLoading === reflection.id" class="w-3 h-3 border-2 border-state-danger border-t-transparent rounded-full animate-spin"></span>
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="loading" class="py-stack-xl text-center">
          <span class="inline-block w-8 h-8 border-4 border-state-selected border-t-transparent rounded-full animate-spin"></span>
          <p class="mt-2 text-ink-muted">Loading reflections…</p>
        </div>

        <div v-else-if="error" class="py-stack-xl text-center bg-state-danger-surface border border-state-danger/20 rounded-panel">
          <p class="text-body text-state-danger">{{ error }}</p>
          <button 
            @click="loadReflections" 
            class="mt-4 px-4 py-2 bg-surface text-ink border border-border rounded-control hover:bg-surface-subtle transition-colors font-medium"
          >
            Retry
          </button>
        </div>

        <div v-else-if="reflections.length === 0" class="py-stack-xl text-center bg-surface-elevated border border-border-muted rounded-panel shadow-sm">
          <p class="text-body text-ink-subtle italic">My private reflections will appear here.</p>
          <p class="text-caption text-ink-muted mt-2">Reflections you save in the Session Workspace will appear here.</p>
        </div>

        <div v-else-if="activeView === 'timeline'">
          <div v-if="filteredReflections.length === 0" class="py-stack-xl text-center bg-surface-elevated border border-border-muted rounded-panel shadow-sm">
            <p class="text-body text-ink-subtle italic">No reflections match this filter.</p>
            <button 
              @click="clearFilters" 
              class="mt-4 text-body-sm text-state-selected font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>

          <div v-else class="space-y-12">
            <div v-for="group in groupedReflections" :key="group.monthYear" class="space-y-4">
              <h3 class="text-h3 font-bold text-ink border-b border-border-muted pb-2 sticky top-0 bg-surface-canvas z-10 py-2">
                {{ group.monthYear }}
              </h3>
              
              <div class="space-y-3">
                <div
                  v-for="reflection in group.items"
                  :key="reflection.id"
                  class="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-surface-elevated border border-border-muted rounded-panel shadow-sm hover:border-state-selected/50 transition-all cursor-pointer"
                  @click="openDetail(reflection)"
                >
                  <div class="flex-1 min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-2">
                      <span class="text-caption font-bold text-ink-secondary uppercase tracking-wider">
                        {{ formatDate(reflection.created_at) }}
                      </span>
                      <span class="px-2 py-0.5 bg-surface-subtle text-caption font-bold text-ink-muted uppercase rounded border border-border">
                        Private Reflection
                      </span>
                      <span v-if="reflection.included_in_supervision" class="inline-flex items-center px-2 py-0.5 bg-state-success-surface text-caption font-bold text-state-success uppercase rounded border border-state-success/20">
                        Supervision Pack
                      </span>
                    </div>

                    <div class="flex items-center gap-4 mb-2">
                      <div v-if="reflection.clients?.display_name" class="flex items-center gap-1.5 text-body-sm text-ink font-semibold">
                        <span class="text-xs">👤</span>
                        {{ reflection.clients.display_name }}
                      </div>
                      <div v-if="reflection.session_ref" class="flex items-center gap-1.5 text-caption text-ink-muted">
                        <span class="text-xs">📅</span>
                        <button 
                          @click.stop="goToSession(reflection)"
                          class="text-state-selected hover:underline font-medium"
                        >
                          View session
                        </button>
                      </div>
                    </div>

                    <p class="text-body-sm text-ink-secondary line-clamp-2 italic leading-relaxed">
                      "{{ reflection.body || 'No content' }}"
                    </p>
                  </div>

                  <div class="flex items-center gap-3 shrink-0">
                    <span v-if="reflection.theme" class="px-2 py-1 bg-surface-subtle text-caption font-bold text-ink-secondary uppercase rounded-full border border-border truncate max-w-[120px]">
                      {{ reflection.theme }}
                    </span>
                    <span v-else class="px-2 py-1 bg-surface-subtle text-caption font-bold text-ink-subtle uppercase rounded-full border border-border">
                      No theme
                    </span>

                    <div class="relative">
                      <button
                        @click.stop="toggleMenu(reflection.id, $event)"
                        class="p-2 hover:bg-surface-subtle rounded-control transition-colors text-ink-muted"
                        :aria-expanded="menuOpenFor === reflection.id"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <circle cx="12" cy="5" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>

                      <div
                        v-if="menuOpenFor === reflection.id"
                        class="absolute right-0 mt-2 w-56 bg-surface-elevated border border-border shadow-elevated rounded-panel py-2 z-20"
                        role="menu"
                        @click.stop
                      >
                        <button
                          @click="openDetail(reflection)"
                          role="menuitem"
                          class="w-full text-left px-4 py-2 text-body-sm text-ink hover:bg-surface-subtle transition-colors"
                        >
                          View Details
                        </button>
                        <div class="my-1 border-t border-border-muted"></div>
                        <button
                          @click="toggleSupervision(reflection)"
                          :disabled="actionLoading === reflection.id"
                          role="menuitem"
                          class="w-full text-left px-4 py-2 text-body-sm text-ink hover:bg-surface-subtle transition-colors flex justify-between items-center"
                        >
                          <span>{{ reflection.included_in_supervision ? 'Remove from Pack' : 'Include in Pack' }}</span>
                          <span v-if="actionLoading === reflection.id" class="w-3 h-3 border-2 border-state-selected border-t-transparent rounded-full animate-spin"></span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="hasMore" class="flex justify-center pt-8">
              <button 
                @click="loadReflections(true)" 
                :disabled="loading"
                class="px-8 py-3 bg-surface border border-border text-body-sm font-semibold text-ink rounded-pill hover:bg-surface-subtle transition-all shadow-sm disabled:opacity-50"
              >
                <span v-if="loading" class="inline-block w-4 h-4 border-2 border-state-selected border-t-transparent rounded-full animate-spin mr-2"></span>
                Load more reflections
              </button>
            </div>
          </div>
        </div>

        <!-- Insights View -->
        <div v-else-if="activeView === 'insights'" class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div class="bg-surface-elevated p-6 rounded-panel border border-border-muted shadow-sm">
              <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-1">Total Reflections</div>
              <div class="text-h2 font-semibold text-ink">{{ insights.total }}</div>
            </div>
            <div class="bg-surface-elevated p-6 rounded-panel border border-border-muted shadow-sm">
              <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-1">Supervision Pack</div>
              <div class="text-h2 font-semibold text-state-success">{{ insights.inSupervision }}</div>
            </div>
            <div class="bg-surface-elevated p-6 rounded-panel border border-border-muted shadow-sm">
              <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-1">Unthemed</div>
              <div class="text-h2 font-semibold text-ink-subtle">{{ insights.noTheme }}</div>
            </div>
            <div class="bg-surface-elevated p-6 rounded-panel border border-border-muted shadow-sm">
              <div class="text-overline font-bold text-ink-muted uppercase tracking-wider mb-1">Top Theme</div>
              <div class="text-h2 font-semibold text-action-link truncate" :title="insights.topTheme">
                {{ insights.topTheme }}
              </div>
            </div>
          </div>

          <div class="text-caption text-ink-muted italic bg-surface-subtle p-3 rounded-control border border-border-muted inline-block">
            Note: Insights are based on currently loaded reflections.
          </div>

          <div class="bg-surface-elevated border border-border-muted rounded-panel overflow-hidden shadow-sm">
            <div class="p-6 border-b border-border-muted bg-surface">
              <h3 class="text-body font-bold text-ink uppercase tracking-wider">Theme Distribution</h3>
            </div>
            <div class="p-6">
              <div v-if="insights.themeCounts.length === 0" class="text-center py-8 text-ink-subtle italic">
                No themes identified yet.
              </div>
              <div v-else class="space-y-4">
                <div v-for="theme in insights.themeCounts" :key="theme.name" class="space-y-2">
                  <div class="flex justify-between text-body-sm font-medium">
                    <span class="text-ink">{{ theme.name }}</span>
                    <span class="text-ink-muted">{{ theme.count }} ({{ Math.round(theme.count / insights.total * 100) }}%)</span>
                  </div>
                  <div class="w-full bg-surface-subtle h-2 rounded-full overflow-hidden">
                    <div 
                      class="bg-state-selected h-full rounded-full" 
                      :style="{ width: (theme.count / insights.total * 100) + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Reflection Detail Modal -->
  <div
    v-if="selectedReflection"
    class="fixed inset-0 bg-backdrop/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 no-print"
    @click.self="closeDetail"
    role="dialog"
    aria-modal="true"
    aria-labelledby="detail-modal-title"
  >
    <div class="w-full max-w-2xl bg-surface-elevated rounded-panel shadow-overlay max-h-[90vh] flex flex-col overflow-hidden border border-border">
      <div class="p-6 border-b border-border-muted flex justify-between items-start">
        <div>
          <h2 id="detail-modal-title" class="text-h2 font-semibold text-ink">Reflection Details</h2>
          <div class="mt-2 flex flex-wrap gap-2">
            <span class="text-caption font-bold text-ink-secondary uppercase tracking-wider">
              {{ formatDate(selectedReflection.created_at) }}
            </span>
            <span v-if="selectedReflection.theme" class="px-2 py-0.5 bg-surface-subtle text-overline font-bold text-ink-secondary uppercase rounded-full border border-border">
              {{ selectedReflection.theme }}
            </span>
            <span v-if="selectedReflection.included_in_supervision" class="inline-flex items-center px-2 py-0.5 bg-state-success-surface text-overline font-bold text-state-success uppercase rounded border border-state-success/20">
              Supervision Pack
            </span>
          </div>
        </div>
        <button 
          @click="closeDetail"
          class="p-2 text-ink-muted hover:text-ink transition-colors rounded-control hover:bg-surface-subtle"
          aria-label="Close detail view"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="p-8 overflow-y-auto flex-1">
        <div class="mb-8 space-y-2 bg-surface-subtle p-4 rounded-panel border border-border-muted">
          <div v-if="selectedReflection.clients?.display_name" class="flex items-center gap-3 text-body-sm text-ink-secondary">
            <span class="w-5 text-center grayscale">👤</span>
            <span class="font-medium">Client:</span> {{ selectedReflection.clients.display_name }}
          </div>
          <div v-if="selectedReflection.session_ref" class="flex items-center gap-3 text-body-sm text-ink-secondary">
            <span class="w-5 text-center grayscale">📅</span>
            <span class="font-medium">Session:</span> 
            <button 
              @click="goToSession(selectedReflection)"
              class="text-state-selected hover:underline font-medium text-left"
            >
              {{ selectedReflection.session_ref }}
            </button>
          </div>
        </div>

        <div class="prose prose-sm max-w-none">
          <p class="text-body text-ink italic whitespace-pre-wrap leading-relaxed">
            "{{ selectedReflection.body || 'No content' }}"
          </p>
        </div>
      </div>

      <div class="p-6 border-t border-border-muted bg-surface flex justify-between items-center">
        <div v-if="updateError[selectedReflection.id]" role="alert" class="text-overline text-state-danger font-medium">
          Could not update selection.
        </div>
        <div v-else></div>

        <div class="flex gap-3">
          <button
            @click="toggleSupervision(selectedReflection)"
            :disabled="actionLoading === selectedReflection.id"
            class="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-body-sm font-semibold text-ink rounded-control hover:bg-surface-subtle transition-all disabled:opacity-50 shadow-sm"
          >
            <span v-if="actionLoading === selectedReflection.id" class="w-4 h-4 border-2 border-state-selected border-t-transparent rounded-full animate-spin"></span>
            {{ selectedReflection.included_in_supervision ? 'Remove from Supervision Pack' : 'Include in Supervision Pack' }}
          </button>
          
          <div class="relative group">
            <button
              disabled
              class="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-body-sm font-semibold text-ink-subtle rounded-control cursor-not-allowed opacity-60"
            >
              More actions
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Export Preview Modal -->
  <div
    v-if="exportPreviewOpen"
    class="fixed inset-0 bg-backdrop/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 print:p-0 print:bg-white"
    @click.self="closeExportPreview"
    role="dialog"
    aria-modal="true"
    aria-labelledby="export-modal-title"
  >
    <div class="w-full max-w-4xl bg-surface rounded-panel shadow-overlay max-h-[90vh] flex flex-col overflow-hidden border border-border no-print">
      <div class="p-6 border-b border-border-muted flex justify-between items-center bg-surface-elevated">
        <div>
          <h2 id="export-modal-title" class="text-h2 font-semibold text-ink">Export Preview</h2>
          <p class="text-caption text-ink-muted mt-1">Review your content before printing or copying.</p>
        </div>
        <button 
          @click="closeExportPreview"
          class="p-2 text-ink-muted hover:text-ink transition-colors rounded-control hover:bg-surface-subtle"
          aria-label="Close export preview"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-auto bg-surface-subtle p-6">
        <div class="max-w-3xl mx-auto bg-white shadow-sm border border-border-muted min-h-full p-12 print-content" id="printable-pack">
          <div class="mb-12 pb-6 border-b-2 border-ink">
            <h1 class="text-3xl font-bold text-ink uppercase tracking-tighter">Supervision Pack</h1>
            <p class="text-body-sm text-ink-muted mt-2">
              Generated on {{ new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }}
            </p>
          </div>

          <div class="space-y-12">
            <div v-for="reflection in supervisionPackReflections" :key="'export-' + reflection.id" class="break-inside-avoid">
              <div class="flex justify-between items-baseline mb-4">
                <div class="flex gap-4 items-center">
                  <span class="text-caption font-bold text-ink uppercase tracking-widest">{{ formatDate(reflection.created_at) }}</span>
                  <span v-if="reflection.theme" class="text-caption font-bold text-ink-secondary uppercase border-l border-border-muted pl-4">{{ reflection.theme }}</span>
                </div>
                <div v-if="includeClientNames && reflection.clients?.display_name" class="text-caption font-bold text-ink-muted italic">
                  Client: {{ reflection.clients.display_name }}
                </div>
              </div>
              <p class="text-body text-ink whitespace-pre-wrap leading-relaxed border-l-4 border-surface-subtle pl-6 py-2">
                {{ reflection.body }}
              </p>
            </div>
          </div>

          <div class="mt-20 pt-8 border-t border-border-muted text-center">
            <p class="text-overline text-ink-subtle">Private & Confidential • Generated by Helios Therapist</p>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-border-muted bg-surface-elevated flex flex-col sm:flex-row justify-between items-center gap-4">
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 cursor-pointer select-none">
            <div class="relative inline-block w-10 h-5 transition duration-200 ease-in-out bg-surface-subtle border border-border rounded-full">
              <input 
                type="checkbox" 
                v-model="includeClientNames"
                class="absolute block w-4 h-4 mt-0.5 ml-0.5 bg-white border border-border rounded-full appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:bg-state-selected"
              />
            </div>
            <span class="text-body-sm font-medium text-ink">Include client names</span>
          </label>
        </div>

        <div class="flex gap-3 w-full sm:w-auto">
          <button
            @click="copyExportText"
            class="flex-1 sm:flex-none px-6 py-2.5 bg-surface border border-border text-body-sm font-bold text-ink rounded-pill hover:bg-surface-subtle transition-all flex items-center justify-center gap-2"
          >
            <span>{{ copying ? '✅' : '📋' }}</span>
            {{ copying ? 'Copied!' : 'Copy Text' }}
          </button>
          <button
            @click="printPack"
            class="flex-1 sm:flex-none px-6 py-2.5 bg-ink text-white text-body-sm font-bold rounded-pill hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <span>🖨️</span>
            Print / PDF
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  .no-print {
    display: none !important;
  }
  
  body {
    background-color: white !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .print-content {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    margin: 0;
    padding: 2cm;
    border: none !important;
    box-shadow: none !important;
  }

  #printable-pack {
    display: block !important;
  }
}
</style>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { getAllPrivateReflections, setReflectionSupervisionSelection } from '../lib/reflections.js';

const router = useRouter();
const reflections = ref([]);
const loading = ref(true);
const error = ref(null);
const actionLoading = ref(null); // ID of reflection currently being updated
const menuOpenFor = ref(null); // ID of reflection with open menu
const updateError = ref({}); // Map of reflection ID to error status
const selectedReflection = ref(null);

  const searchQuery = ref('');
const selectedTheme = ref('All');
const activeView = ref('timeline'); // 'timeline', 'insights' or 'pack'
const exportPreviewOpen = ref(false);
const includeClientNames = ref(false);
const copying = ref(false);

const supervisionPackReflections = computed(() => {
  return reflections.value.filter(r => r.included_in_supervision);
});

const insights = computed(() => {
  const total = reflections.value.length;
  if (total === 0) {
    return {
      total: 0,
      inSupervision: 0,
      noTheme: 0,
      topTheme: 'None',
      themeCounts: []
    };
  }

  const inSupervision = reflections.value.filter(r => r.included_in_supervision).length;
  const noTheme = reflections.value.filter(r => !r.theme).length;
  
  const themeCountsMap = {};
  reflections.value.forEach(r => {
    const t = r.theme || 'No theme';
    themeCountsMap[t] = (themeCountsMap[t] || 0) + 1;
  });

  const themeCounts = Object.entries(themeCountsMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const topTheme = themeCounts.find(t => t.name !== 'No theme')?.name || 'No theme';

  return {
    total,
    inSupervision,
    noTheme,
    topTheme,
    themeCounts
  };
});

const themes = computed(() => {
  const counts = { All: reflections.value.length };
  const themeList = ['All'];
  
  reflections.value.forEach(r => {
    const t = r.theme || 'No theme';
    counts[t] = (counts[t] || 0) + 1;
    if (!themeList.includes(t)) themeList.push(t);
  });

  // Sort themes: All first, then alphabetically, then 'No theme' last if it exists
  const sortedThemes = themeList.filter(t => t !== 'All' && t !== 'No theme').sort();
  if (themeList.includes('No theme')) sortedThemes.push('No theme');
  
  return ['All', ...sortedThemes].map(t => ({
    name: t,
    count: counts[t]
  }));
});

const filteredReflections = computed(() => {
  return reflections.value.filter(r => {
    const matchesTheme = selectedTheme.value === 'All' || 
                         (selectedTheme.value === 'No theme' ? !r.theme : r.theme === selectedTheme.value);
    
    const query = searchQuery.value.toLowerCase().trim();
    const matchesSearch = !query || 
                          (r.body && r.body.toLowerCase().includes(query)) ||
                          (r.theme && r.theme.toLowerCase().includes(query)) ||
                          (r.clients?.display_name && r.clients.display_name.toLowerCase().includes(query)) ||
                          (r.session_ref && r.session_ref.toLowerCase().includes(query));
                          
    return matchesTheme && matchesSearch;
  });
});

const groupedReflections = computed(() => {
  const groups = {};
  filteredReflections.value.forEach(r => {
    const date = new Date(r.created_at);
    const monthYear = date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(r);
  });
  
  return Object.entries(groups).map(([monthYear, items]) => ({
    monthYear,
    items
  }));
});

const hasMore = ref(true);
const limit = 20;

function clearFilters() {
  searchQuery.value = '';
  selectedTheme.value = 'All';
}

onMounted(() => {
  loadReflections();
  window.addEventListener('click', closeMenuOnOutsideClick);
  window.addEventListener('keydown', closeMenuOnEscape);
});

onUnmounted(() => {
  window.removeEventListener('click', closeMenuOnOutsideClick);
  window.removeEventListener('keydown', closeMenuOnEscape);
});

async function loadReflections(append = false) {
  if (!append) {
    loading.value = true;
    // Do not clear reflections if we are just switching views to avoid flicker
    if (activeView.value !== 'pack' && activeView.value !== 'insights') {
      reflections.value = [];
    }
  }
  error.value = null;
  try {
    const offset = append ? reflections.value.length : 0;
    const data = await getAllPrivateReflections({ offset, limit });
    if (append) {
      reflections.value = [...reflections.value, ...data];
    } else {
      reflections.value = data;
    }
    hasMore.value = data.length === limit;
  } catch (err) {
    console.error('[Supervision] Load error:', err);
    error.value = 'Could not load reflections. Please try again.';
  } finally {
    loading.value = false;
  }
}

function openExportPreview() {
  exportPreviewOpen.value = true;
  document.body.style.overflow = 'hidden';
}

function closeExportPreview() {
  exportPreviewOpen.value = false;
  document.body.style.overflow = '';
}

async function copyExportText() {
  if (copying.value) return;
  copying.value = true;
  
  try {
    let text = "SUPERVISION PACK\n";
    text += `Generated on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n`;
    
    supervisionPackReflections.value.forEach(r => {
      text += `DATE: ${formatDate(r.created_at)}\n`;
      if (r.theme) text += `THEME: ${r.theme}\n`;
      if (includeClientNames.value && r.clients?.display_name) {
        text += `CLIENT: ${r.clients.display_name}\n`;
      }
      text += `\n"${r.body}"\n\n`;
      text += `-------------------\n\n`;
    });
    
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Failed to copy:', err);
  } finally {
    setTimeout(() => {
      copying.value = false;
    }, 1000);
  }
}

function printPack() {
  window.print();
}

async function toggleSupervision(reflection) {
  if (actionLoading.value) return;
  
  const originalState = reflection.included_in_supervision;
  actionLoading.value = reflection.id;
  updateError.value[reflection.id] = false;
  menuOpenFor.value = null;

  try {
    const updated = await setReflectionSupervisionSelection({
      reflectionId: reflection.id,
      included: !originalState
    });
    
    // Update local state
    const index = reflections.value.findIndex(r => r.id === reflection.id);
    if (index !== -1) {
      reflections.value[index] = { ...reflections.value[index], ...updated };
      
      // Keep selected reflection in sync if open
      if (selectedReflection.value?.id === reflection.id) {
        selectedReflection.value = { ...selectedReflection.value, ...updated };
      }
    }
  } catch (err) {
    console.error('[Supervision] Toggle error:', err);
    updateError.value[reflection.id] = true;
  } finally {
    actionLoading.value = null;
  }
}

function openDetail(reflection) {
  selectedReflection.value = { ...reflection };
  menuOpenFor.value = null;
}

function closeDetail() {
  selectedReflection.value = null;
}

function toggleMenu(id, event) {
  event.stopPropagation();
  if (menuOpenFor.value === id) {
    menuOpenFor.value = null;
  } else {
    menuOpenFor.value = id;
  }
}

function closeMenuOnOutsideClick() {
  menuOpenFor.value = null;
}

function closeMenuOnEscape(e) {
  if (e.key === 'Escape') {
    menuOpenFor.value = null;
    selectedReflection.value = null;
  }
}

function goToSession(reflection) {
  if (reflection.client_id && reflection.session_ref) {
    router.push(`/clients/${reflection.client_id}/sessions/${reflection.session_ref}`);
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}
</script>
