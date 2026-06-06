const TasksModule = {
    currentFilter: 'all',
    currentSearch: '',

    init() {
        const statusFilter = document.getElementById('statusFilter');
        const taskSearch = document.getElementById('taskSearch');
        
        if (statusFilter) {
            statusFilter.addEventListener('change', function(e) {
                this.currentFilter = e.target.value;
                this.render();
            }.bind(this));
        }
        
        if (taskSearch) {
            taskSearch.addEventListener('input', function(e) {
                this.currentSearch = e.target.value.toLowerCase();
                this.render();
            }.bind(this));
        }

        this.render();
    },

    render() {
        this.renderStatusFlow();
        this.renderTaskList();
        this.renderMonitorTaskSelect();
    },

    renderStatusFlow() {
        const flowItems = document.querySelectorAll('.task-status-flow .flow-item');
        const self = this;
        flowItems.forEach(function(item) {
            item.classList.remove('active', 'completed');
            const status = item.getAttribute('data-status');
            
            const hasStatus = SimData.simulationTasks.some(function(t) { return t.status === status; });
            if (hasStatus) {
                const idx = StateManager.STATUS_FLOW.indexOf(status);
                const anyCurrent = SimData.simulationTasks.some(function(t) {
                    const curIdx = StateManager.STATUS_FLOW.indexOf(t.status);
                    return curIdx === idx;
                });
                const anyPast = SimData.simulationTasks.some(function(t) {
                    const curIdx = StateManager.STATUS_FLOW.indexOf(t.status);
                    return curIdx > idx;
                });
                if (anyCurrent) item.classList.add('active');
                else if (anyPast) item.classList.add('completed');
            }
        });
    },

    renderTaskList() {
        const listEl = document.getElementById('taskList');
        if (!listEl) return;

        let tasks = SimData.simulationTasks.slice();
        
        if (this.currentFilter !== 'all') {
            tasks = tasks.filter(function(t) { return t.status === this.currentFilter; }.bind(this));
        }
        
        if (this.currentSearch) {
            tasks = tasks.filter(function(t) {
                return t.id.toLowerCase().includes(this.currentSearch) ||
                       t.name.toLowerCase().includes(this.currentSearch);
            }.bind(this));
        }

        if (tasks.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:48px;color:#78909c;">暂无任务数据</div>';
            return;
        }

        listEl.innerHTML = tasks.map(function(task) {
            const particleName = StateManager.PARTICLE_LABELS[task.primaryParticle] || task.primaryParticle;
            return '<div class="task-card" data-task-id="' + task.id + '">' +
                '<div class="task-header">' +
                    '<div>' +
                        '<div class="task-title">' + task.name + '</div>' +
                        '<div class="task-id">' + task.id + ' · ' + StateManager.formatDate(task.createdAt) + '</div>' +
                    '</div>' +
                    '<span class="status-badge status-' + task.status + '">' +
                        StateManager.STATUS_LABELS[task.status] +
                    '</span>' +
                '</div>' +
                '<div class="task-meta">' +
                    '<div class="task-meta-item">' +
                        '<span class="meta-label">初级粒子</span>' +
                        '<span class="meta-value">' + particleName + '</span>' +
                    '</div>' +
                    '<div class="task-meta-item">' +
                        '<span class="meta-label">初始能量</span>' +
                        '<span class="meta-value">' + StateManager.formatEnergy(task.energy) + '</span>' +
                    '</div>' +
                    '<div class="task-meta-item">' +
                        '<span class="meta-label">天顶角</span>' +
                        '<span class="meta-value">' + task.zenithAngle.toFixed(1) + '°</span>' +
                    '</div>' +
                    '<div class="task-meta-item">' +
                        '<span class="meta-label">大气模型</span>' +
                        '<span class="meta-value">' + task.atmosphereModel + '</span>' +
                    '</div>' +
                '</div>' +
                (task.totalParticles > 0 ? 
                '<div class="task-meta" style="border-top:none;padding-top:8px;">' +
                    '<div class="task-meta-item">' +
                        '<span class="meta-label">X_max</span>' +
                        '<span class="meta-value">' + task.xmax.toFixed(1) + ' g/cm²</span>' +
                    '</div>' +
                    '<div class="task-meta-item">' +
                        '<span class="meta-label">总粒子数</span>' +
                        '<span class="meta-value">' + task.totalParticles.toExponential(2) + '</span>' +
                    '</div>' +
                    '<div class="task-meta-item">' +
                        '<span class="meta-label">重建能量</span>' +
                        '<span class="meta-value">' + (task.reconstructedEnergy ? StateManager.formatEnergy(task.reconstructedEnergy) : '-') + '</span>' +
                    '</div>' +
                    '<div class="task-meta-item">' +
                        '<span class="meta-label">触发效率</span>' +
                        '<span class="meta-value">' + (task.triggerEfficiency ? task.triggerEfficiency.toFixed(1) + '%' : '-') + '</span>' +
                    '</div>' +
                '</div>' : '') +
                '<div class="task-progress">' +
                    '<div class="progress-bar"><div class="progress-fill" style="width:' + task.progress + '%"></div></div>' +
                    '<div class="progress-text"><span>进度</span><span>' + task.progress + '%</span></div>' +
                '</div>' +
            '</div>';
        }).join('');

        listEl.querySelectorAll('.task-card').forEach(function(card) {
            card.addEventListener('click', function() {
                TasksModule.showTaskDetail(card.getAttribute('data-task-id'));
            });
        });
    },

    renderMonitorTaskSelect() {
        const select = document.getElementById('monitorTaskSelect');
        if (!select) return;
        const currentVal = select.value;
        
        select.innerHTML = '<option value="">选择模拟任务...</option>' +
            SimData.simulationTasks.map(function(t) {
                return '<option value="' + t.id + '">' + t.name + ' (' + t.id + ')</option>';
            }).join('');
        
        if (currentVal && SimData.getTaskById(currentVal)) {
            select.value = currentVal;
        }
    },

    showTaskDetail(taskId) {
        const task = SimData.getTaskById(taskId);
        if (!task) return;

        const modal = document.getElementById('taskDetailModal');
        const titleEl = document.getElementById('modalTaskTitle');
        const contentEl = document.getElementById('taskDetailContent');
        
        titleEl.textContent = task.name + ' - 任务详情';
        
        const particleName = StateManager.PARTICLE_LABELS[task.primaryParticle] || task.primaryParticle;
        
        contentEl.innerHTML = 
            '<div class="detail-section">' +
                '<h4>📋 基本信息</h4>' +
                '<div class="detail-grid">' +
                    '<div class="detail-item"><span class="detail-label">任务ID</span><span class="detail-value">' + task.id + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">状态</span><span class="detail-value"><span class="status-badge status-' + task.status + '">' + StateManager.STATUS_LABELS[task.status] + '</span></span></div>' +
                    '<div class="detail-item"><span class="detail-label">创建时间</span><span class="detail-value">' + StateManager.formatDate(task.createdAt) + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">进度</span><span class="detail-value">' + task.progress + '%</span></div>' +
                '</div>' +
            '</div>' +
            '<div class="detail-section">' +
                '<h4>🌌 模拟参数</h4>' +
                '<div class="detail-grid">' +
                    '<div class="detail-item"><span class="detail-label">初级粒子</span><span class="detail-value">' + particleName + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">初始能量</span><span class="detail-value">' + StateManager.formatEnergy(task.energy) + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">天顶角</span><span class="detail-value">' + task.zenithAngle.toFixed(1) + '°</span></div>' +
                    '<div class="detail-item"><span class="detail-label">方位角</span><span class="detail-value">' + task.azimuthAngle.toFixed(1) + '°</span></div>' +
                    '<div class="detail-item"><span class="detail-label">大气模型</span><span class="detail-value">' + task.atmosphereModel + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">观测高度</span><span class="detail-value">' + task.observationAltitude.toFixed(0) + ' m</span></div>' +
                '</div>' +
            '</div>' +
            (task.totalParticles > 0 ? 
            '<div class="detail-section">' +
                '<h4>📊 模拟结果</h4>' +
                '<div class="detail-grid">' +
                    '<div class="detail-item"><span class="detail-label">簇射最大深度 X_max</span><span class="detail-value">' + task.xmax.toFixed(1) + ' g/cm²</span></div>' +
                    '<div class="detail-item"><span class="detail-label">总粒子数</span><span class="detail-value">' + task.totalParticles.toExponential(2) + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">μ子占比</span><span class="detail-value">' + task.muonFraction.toFixed(1) + '%</span></div>' +
                    '<div class="detail-item"><span class="detail-label">电磁成分占比</span><span class="detail-value">' + task.emFraction.toFixed(1) + '%</span></div>' +
                    '<div class="detail-item"><span class="detail-label">重建能量</span><span class="detail-value">' + (task.reconstructedEnergy ? StateManager.formatEnergy(task.reconstructedEnergy) : '-') + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">重建分辨率</span><span class="detail-value">' + (task.reconstructionResolution ? task.reconstructionResolution.toFixed(1) + '%' : '-') + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">触发效率</span><span class="detail-value">' + (task.triggerEfficiency ? task.triggerEfficiency.toFixed(1) + '%' : '-') + '</span></div>' +
                '</div>' +
            '</div>' : '') +
            '<div class="detail-section">' +
                '<h4>✅ 审批状态</h4>' +
                '<div class="detail-grid">' +
                    '<div class="detail-item"><span class="detail-label">物理学家审批</span><span class="detail-value">' + (task.physicistApproved ? '✅ 已通过' : '⏳ 待审批') + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">工程师审批</span><span class="detail-value">' + (task.engineerApproved ? '✅ 已通过' : '⏳ 待审批') + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">推送优化系统</span><span class="detail-value">' + (task.pushedToOptimization ? '🚀 已推送' : '⏳ 等待') + '</span></div>' +
                    '<div class="detail-item"><span class="detail-label">偏差预警</span><span class="detail-value">' + (task.deviationAlert ? '🔴 已触发' : '✅ 正常') + '</span></div>' +
                '</div>' +
            '</div>' +
            (task.eventFiles && task.eventFiles.length ?
            '<div class="detail-section">' +
                '<h4>📁 关联文件</h4>' +
                '<div style="font-size:13px;">事件数据: ' + task.eventFiles.join(', ') + '</div>' +
                (task.atmosphereFiles && task.atmosphereFiles.length ? '<div style="font-size:13px;margin-top:6px;">大气模型: ' + task.atmosphereFiles.join(', ') + '</div>' : '') +
            '</div>' : '');

        modal.classList.remove('hidden');
    }
};
