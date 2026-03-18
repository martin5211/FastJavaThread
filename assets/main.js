// @ts-check
(function () {
    // @ts-ignore - acquireVsCodeApi is provided by the VS Code webview runtime
    const vscode = acquireVsCodeApi();

    /** @param {Record<string, number>} stateGroups */
    function renderChart(stateGroups) {
        const canvas = document.getElementById('stateChart');
        // @ts-ignore - Chart is loaded globally from chart.umd.js
        if (!canvas || typeof Chart === 'undefined') return;

        const labels = Object.keys(stateGroups);
        const data = Object.values(stateGroups);
        const colors = {
            RUNNABLE: '#4caf50',
            BLOCKED: '#f44336',
            WAITING: '#ff9800',
            TIMED_WAITING: '#2196f3',
            NEW: '#9c27b0',
            TERMINATED: '#607d8b',
            UNKNOWN: '#795548',
        };

        // @ts-ignore
        new Chart(canvas, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: labels.map(l => colors[l] || '#999'),
                }],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--vscode-foreground') || '#ccc',
                        },
                    },
                },
            },
        });
    }

    /** @param {Array<{method: string, count: number}>} methods */
    function renderHotMethods(methods) {
        const container = document.getElementById('hotMethods');
        if (!container || !methods.length) return;

        let html = '<table><tr><th>#</th><th>Method</th><th>Count</th></tr>';
        methods.forEach((m, i) => {
            html += `<tr><td>${i + 1}</td><td>${escapeHtml(m.method)}</td><td>${m.count}</td></tr>`;
        });
        html += '</table>';
        container.innerHTML = html;
    }

    /** @param {Array<{threads: Array<{name: string, state: string}>, locks: Array<{lockId: string, className: string}>}>} deadlocks */
    function renderDeadlocks(deadlocks) {
        const container = document.getElementById('deadlocks');
        if (!container) return;
        if (!deadlocks || deadlocks.length === 0) {
            container.classList.add('hidden');
            return;
        }
        container.classList.remove('hidden');

        let html = '<h2>Deadlock Detected!</h2>';
        deadlocks.forEach((cycle, i) => {
            html += `<div class="deadlock-cycle"><strong>Cycle ${i + 1}:</strong><ul>`;
            cycle.threads.forEach(t => {
                html += `<li>${escapeHtml(t.name)} (${escapeHtml(t.state)})</li>`;
            });
            html += '</ul></div>';
        });
        container.innerHTML = html;
    }

    /**
     * @param {Record<string, number>} stateGroups
     * @param {number} totalThreads
     */
    function renderSummary(stateGroups, totalThreads) {
        const container = document.getElementById('summary');
        if (!container) return;

        let html = '';
        html += `<div class="summary-card"><span class="count">${totalThreads}</span><span class="label">Total Threads</span></div>`;
        for (const [state, count] of Object.entries(stateGroups)) {
            html += `<div class="summary-card"><span class="count">${count}</span><span class="label">${escapeHtml(String(state))}</span></div>`;
        }
        container.innerHTML = html;
    }

    /** @param {string} text */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function init() {
        const dataEl = document.getElementById('dump-data');
        if (!dataEl) return;

        const data = JSON.parse(dataEl.textContent || '{}');
        renderSummary(data.stateGroups, data.totalThreads);
        renderChart(data.stateGroups);
        renderHotMethods(data.hotMethods);
        renderDeadlocks(data.deadlocks);
    }

    window.addEventListener('message', event => {
        const message = event.data;
        if (message.type === 'update') {
            const dataEl = document.getElementById('dump-data');
            if (dataEl) {
                dataEl.textContent = JSON.stringify(message.data);
                init();
            }
        }
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
