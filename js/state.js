const StateManager = {
    STATUS_FLOW: ['pending', 'validating', 'simulating', 'detecting', 'reconstructing', 'completed'],
    STATUS_LABELS: {
        pending: '待提交',
        validating: '大气模型校验',
        simulating: '级联模拟中',
        detecting: '探测器响应',
        reconstructing: '事件重建',
        completed: '完成',
        rollback: '异常回退'
    },
    PARTICLE_LABELS: {
        proton: '质子',
        gamma: '伽马射线',
        iron: '铁核',
        helium: '氦核'
    },

    advanceStatus(taskId) {
        const task = SimData.getTaskById(taskId);
        if (!task) return null;
        
        const currentIdx = this.STATUS_FLOW.indexOf(task.status);
        if (currentIdx === -1 || currentIdx >= this.STATUS_FLOW.length - 1) {
            return task;
        }
        
        const nextStatus = this.STATUS_FLOW[currentIdx + 1];
        const progress = ((currentIdx + 2) / this.STATUS_FLOW.length) * 100;
        
        let updates = { status: nextStatus, progress: Math.round(progress) };
        
        if (nextStatus === 'validating') {
            SimData.addNotification({
                title: '大气模型校验启动',
                description: '任务 ' + task.name + ' 开始大气模型校验',
                level: 'info',
                taskId: taskId
            });
        } else if (nextStatus === 'simulating') {
            updates.xmax = 400 + Math.random() * 400;
            updates.totalParticles = Math.floor(1e5 + Math.random() * 1e7);
            updates.muonFraction = 10 + Math.random() * 30;
            updates.emFraction = 60 + Math.random() * 30;
            SimData.addNotification({
                title: '级联模拟开始',
                description: '任务 ' + task.name + ' 进入级联模拟阶段',
                level: 'info',
                taskId: taskId
            });
        } else if (nextStatus === 'detecting') {
            SimData.addNotification({
                title: '探测器响应计算',
                description: '任务 ' + task.name + ' 正在计算探测器响应',
                level: 'info',
                taskId: taskId
            });
        } else if (nextStatus === 'reconstructing') {
            const deviation = 5 + Math.random() * 15;
            updates.reconstructedEnergy = task.energy * (1 + (Math.random() > 0.5 ? 1 : -1) * deviation / 100);
            updates.reconstructionResolution = deviation;
            SimData.addNotification({
                title: '事件重建进行中',
                description: '任务 ' + task.name + ' 正在进行事件重建',
                level: 'info',
                taskId: taskId
            });
        } else if (nextStatus === 'completed') {
            updates.triggerEfficiency = 85 + Math.random() * 15;
            updates.physicistApproved = false;
            updates.engineerApproved = false;
            SimData.addNotification({
                title: '模拟任务完成',
                description: '任务 ' + task.name + ' 已完成，等待审批',
                level: 'info',
                taskId: taskId
            });
            
            if (SimData.checkDeviationAlert()) {
                updates.deviationAlert = true;
                SimData.addNotification({
                    title: '⚠️ 重建能量偏差超标',
                    description: '同一能量段连续三次模拟的重建能量偏差超过10%，已自动暂停新任务并通知首席科学家',
                    level: 'critical',
                    taskId: taskId
                });
            }
        }
        
        return SimData.updateTask(taskId, updates);
    },

    rollbackStatus(taskId, reason) {
        const task = SimData.getTaskById(taskId);
        if (!task) return null;
        
        SimData.updateTask(taskId, { status: 'rollback' });
        
        SimData.addNotification({
            title: '⚠️ 任务异常回退',
            description: '任务 ' + task.name + ' 已回退，原因：' + (reason || '未指定'),
            level: 'warning',
            taskId: taskId
        });
        
        return SimData.getTaskById(taskId);
    },

    checkThresholds(taskId) {
        const task = SimData.getTaskById(taskId);
        if (!task) return;
        
        const xmaxThreshold = parseFloat(document.getElementById('xmaxThreshold')?.value) || 800;
        const particleThreshold = parseFloat(document.getElementById('particleThreshold')?.value) || 1000;
        
        if (task.xmax && task.xmax > xmaxThreshold) {
            SimData.addNotification({
                title: '⚠️ 簇射最大深度超过阈值',
                description: '任务 ' + task.name + ' X_max=' + task.xmax.toFixed(1) + ' g/cm² 超过阈值 ' + xmaxThreshold + ' g/cm²，请值班物理学家复核',
                level: 'warning',
                taskId: taskId
            });
        }
        
        if (task.totalParticles && (task.totalParticles < particleThreshold || task.totalParticles > particleThreshold * 100)) {
            SimData.addNotification({
                title: '🚨 粒子数异常',
                description: '任务 ' + task.name + ' 总粒子数=' + task.totalParticles.toExponential(2) + ' 异常，触发二级预警',
                level: 'danger',
                taskId: taskId
            });
        }
    },

    showToast(message, type) {
        type = type || 'info';
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = 'toast ' + type;
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
        toast.innerHTML = '<span>' + (icons[type] || 'ℹ️') + '</span><span>' + message + '</span>';
        container.appendChild(toast);
        setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(40px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    },

    formatEnergy(ev) {
        if (ev >= 1e18) return (ev / 1e18).toFixed(2) + ' EeV';
        if (ev >= 1e15) return (ev / 1e15).toFixed(2) + ' PeV';
        if (ev >= 1e12) return (ev / 1e12).toFixed(2) + ' TeV';
        if (ev >= 1e9) return (ev / 1e9).toFixed(2) + ' GeV';
        return ev.toExponential(2) + ' eV';
    },

    formatDate(isoString) {
        const d = new Date(isoString);
        return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    },

    formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }
};
