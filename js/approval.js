const ApprovalModule = {
    currentTaskId: null,
    currentApprovalType: null,

    init() {
        this.render();
        this.setupApprovalModal();
    },

    render() {
        this.renderApprovalFlow();
        this.renderPhysicistList();
        this.renderEngineerList();
    },

    renderApprovalFlow() {
        var pendingPhysicist = SimData.simulationTasks.filter(function(t) {
            return t.status === 'completed' && !t.physicistApproved;
        }).length;
        var pendingEngineer = SimData.simulationTasks.filter(function(t) {
            return t.status === 'completed' && t.physicistApproved && !t.engineerApproved;
        }).length;
        var pushed = SimData.simulationTasks.filter(function(t) { return t.pushedToOptimization; }).length;

        var physicistStage = document.querySelectorAll('.approval-stage')[0];
        var engineerStage = document.querySelectorAll('.approval-stage')[1];
        var finalStage = document.querySelectorAll('.approval-stage')[2];

        if (physicistStage) {
            physicistStage.classList.remove('current', 'completed');
            if (pendingPhysicist > 0) physicistStage.classList.add('current');
        }
        if (engineerStage) {
            engineerStage.classList.remove('current', 'completed');
            if (pendingEngineer > 0) engineerStage.classList.add('current');
        }
        if (finalStage) {
            finalStage.classList.remove('current', 'completed');
            if (pushed > 0) finalStage.classList.add('completed');
        }

        var physicistStatus = document.getElementById('physicistStatusText');
        var engineerStatus = document.getElementById('engineerStatusText');
        var finalStatus = document.getElementById('finalStatusText');
        
        if (physicistStatus) physicistStatus.textContent = pendingPhysicist > 0 ? pendingPhysicist + ' 项待审' : '无待审';
        if (engineerStatus) engineerStatus.textContent = pendingEngineer > 0 ? pendingEngineer + ' 项待审' : '无待审';
        if (finalStatus) finalStatus.textContent = pushed + ' 项已推送';
    },

    renderPhysicistList() {
        var listEl = document.getElementById('physicistApprovalList');
        if (!listEl) return;

        var tasks = SimData.simulationTasks.filter(function(t) {
            return t.status === 'completed' && !t.physicistApproved;
        });

        if (tasks.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:24px;color:#78909c;">暂无待审批任务</div>';
            return;
        }

        var self = this;
        listEl.innerHTML = tasks.map(function(t) {
            var particle = StateManager.PARTICLE_LABELS[t.primaryParticle] || t.primaryParticle;
            var deviation = t.reconstructionResolution ? t.reconstructionResolution.toFixed(1) : '-';
            return '<div class="approval-item">' +
                '<div class="approval-item-header">' +
                    '<span class="approval-item-title">' + t.name + '</span>' +
                    '<span class="status-badge status-completed">' + StateManager.STATUS_LABELS[t.status] + '</span>' +
                '</div>' +
                '<div class="approval-item-meta">' +
                    t.id + ' · ' + particle + ' · ' + StateManager.formatEnergy(t.energy) + ' · 天顶角 ' + t.zenithAngle.toFixed(1) + '°' +
                    (deviation !== '-' ? ' · 分辨率 ' + deviation + '%' : '') +
                '</div>' +
                '<div class="approval-item-actions">' +
                    '<button class="btn-danger" data-task="' + t.id + '" data-type="physicist" data-action="reject">❌ 驳回</button>' +
                    '<button class="btn-success" data-task="' + t.id + '" data-type="physicist" data-action="approve">✅ 通过</button>' +
                '</div>' +
            '</div>';
        }).join('');

        listEl.querySelectorAll('button').forEach(function(btn) {
            btn.addEventListener('click', function() {
                self.openApprovalModal(btn.getAttribute('data-task'), btn.getAttribute('data-type'), btn.getAttribute('data-action'));
            });
        });
    },

    renderEngineerList() {
        var listEl = document.getElementById('engineerApprovalList');
        if (!listEl) return;

        var tasks = SimData.simulationTasks.filter(function(t) {
            return t.status === 'completed' && t.physicistApproved && !t.engineerApproved;
        });

        if (tasks.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:24px;color:#78909c;">暂无待审批任务</div>';
            return;
        }

        var self = this;
        listEl.innerHTML = tasks.map(function(t) {
            var particle = StateManager.PARTICLE_LABELS[t.primaryParticle] || t.primaryParticle;
            return '<div class="approval-item">' +
                '<div class="approval-item-header">' +
                    '<span class="approval-item-title">' + t.name + '</span>' +
                    '<span class="status-badge status-completed">' + StateManager.STATUS_LABELS[t.status] + '</span>' +
                '</div>' +
                '<div class="approval-item-meta">' +
                    t.id + ' · ' + particle + ' · ' + StateManager.formatEnergy(t.energy) +
                    ' · 触发效率 ' + (t.triggerEfficiency ? t.triggerEfficiency.toFixed(1) + '%' : '-') +
                '</div>' +
                '<div class="approval-item-actions">' +
                    '<button class="btn-danger" data-task="' + t.id + '" data-type="engineer" data-action="reject">❌ 驳回</button>' +
                    '<button class="btn-success" data-task="' + t.id + '" data-type="engineer" data-action="approve">✅ 通过</button>' +
                '</div>' +
            '</div>';
        }).join('');

        listEl.querySelectorAll('button').forEach(function(btn) {
            btn.addEventListener('click', function() {
                self.openApprovalModal(btn.getAttribute('data-task'), btn.getAttribute('data-type'), btn.getAttribute('data-action'));
            });
        });
    },

    setupApprovalModal() {
        var self = this;
        var modal = document.getElementById('approvalModal');
        var closeBtn = document.getElementById('closeApprovalModal');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', function() {
                modal.classList.add('hidden');
            });
        }

        var approveBtn = document.getElementById('approveBtn');
        var rejectBtn = document.getElementById('rejectBtn');
        
        if (approveBtn) {
            approveBtn.addEventListener('click', function() {
                self.executeApproval('approve');
            });
        }
        if (rejectBtn) {
            rejectBtn.addEventListener('click', function() {
                self.executeApproval('reject');
            });
        }
    },

    openApprovalModal(taskId, type, action) {
        this.currentTaskId = taskId;
        this.currentApprovalType = type;

        var title = document.getElementById('approvalModalTitle');
        var typeName = type === 'physicist' ? '物理学家' : '探测器工程师';
        var actionName = action === 'approve' ? '通过' : '驳回';
        if (title) title.textContent = typeName + '审批 - ' + actionName + '确认';

        var commentEl = document.getElementById('approvalComment');
        if (commentEl) commentEl.value = '';

        var approveBtn = document.getElementById('approveBtn');
        var rejectBtn = document.getElementById('rejectBtn');
        if (action === 'approve') {
            approveBtn.style.display = 'inline-flex';
            rejectBtn.style.display = 'none';
        } else {
            approveBtn.style.display = 'none';
            rejectBtn.style.display = 'inline-flex';
        }

        document.getElementById('approvalModal').classList.remove('hidden');
    },

    executeApproval(action) {
        var taskId = this.currentTaskId;
        var type = this.currentApprovalType;
        var comment = document.getElementById('approvalComment').value;
        var task = SimData.getTaskById(taskId);

        if (!task) return;

        if (action === 'approve') {
            if (type === 'physicist') {
                SimData.updateTask(taskId, { physicistApproved: true });
                StateManager.showToast('物理学家审批通过，已提交给探测器工程师', 'success');
                SimData.addNotification({
                    title: '物理学家审批通过',
                    description: task.name + ' 簇射模型已验证通过，等待工程师确认探测器响应',
                    level: 'info',
                    taskId: taskId
                });
            } else {
                SimData.updateTask(taskId, { engineerApproved: true, pushedToOptimization: true });
                StateManager.showToast('工程师审批通过，已自动推送至阵列优化系统', 'success');
                SimData.addNotification({
                    title: '✅ 审批流程完成',
                    description: task.name + ' 已通过两级审批，自动推送至阵列优化系统',
                    level: 'success',
                    taskId: taskId
                });
            }
        } else {
            if (type === 'physicist') {
                StateManager.rollbackStatus(taskId, '物理学家驳回 - ' + comment);
            } else {
                SimData.updateTask(taskId, { physicistApproved: false, status: 'rollback' });
                StateManager.showToast('已驳回，返回物理学家复核', 'warning');
                SimData.addNotification({
                    title: '⚠️ 工程师驳回',
                    description: task.name + ' 探测器响应未通过，返回物理学家复核',
                    level: 'warning',
                    taskId: taskId
                });
            }
        }

        document.getElementById('approvalModal').classList.add('hidden');
        this.render();
        if (typeof TasksModule !== 'undefined' && TasksModule.render) {
            TasksModule.render();
        }
    }
};
