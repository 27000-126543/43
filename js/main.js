(function() {
    function initApp() {
        SimData.init();
        
        setupNavigation();
        setupModals();

        if (typeof DashboardModule !== 'undefined') DashboardModule.init();
        if (typeof UploadModule !== 'undefined') UploadModule.init();
        if (typeof TasksModule !== 'undefined') TasksModule.init();
        if (typeof MonitorModule !== 'undefined') MonitorModule.init();
        if (typeof ApprovalModule !== 'undefined') ApprovalModule.init();
        if (typeof OptimizeModule !== 'undefined') OptimizeModule.init();
        if (typeof ReportsModule !== 'undefined') ReportsModule.init();

        setInterval(function() {
            if (typeof DashboardModule !== 'undefined') {
                DashboardModule.refresh();
            }
            if (typeof TasksModule !== 'undefined' && document.getElementById('page-tasks').classList.contains('hidden') === false) {
                TasksModule.render();
            }
            if (typeof ApprovalModule !== 'undefined' && document.getElementById('page-approval').classList.contains('hidden') === false) {
                ApprovalModule.render();
            }
        }, 10000);

        if (SimData.notifications.length === 0) {
            SimData.addNotification({
                title: '系统启动完成',
                description: '宇宙线空气簇射模拟平台已就绪，您可以开始创建模拟任务',
                level: 'info'
            });
            if (typeof DashboardModule !== 'undefined') {
                DashboardModule.updateNotificationList();
            }
        }

        console.log('🚀 宇宙线空气簇射模拟与探测器阵列优化平台启动成功');
    }

    function setupNavigation() {
        var navBtns = document.querySelectorAll('.nav-btn');
        var pages = document.querySelectorAll('.page-section');

        navBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                var pageId = btn.getAttribute('data-page');
                
                navBtns.forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
                
                pages.forEach(function(p) { p.classList.add('hidden'); });
                var target = document.getElementById('page-' + pageId);
                if (target) {
                    target.classList.remove('hidden');
                    
                    if (pageId === 'monitor' && typeof MonitorModule !== 'undefined') {
                        setTimeout(function() {
                            MonitorModule.refreshAll();
                        }, 100);
                    }
                    if (pageId === 'tasks' && typeof TasksModule !== 'undefined') {
                        TasksModule.render();
                    }
                    if (pageId === 'approval' && typeof ApprovalModule !== 'undefined') {
                        ApprovalModule.render();
                    }
                    if (pageId === 'optimize' && typeof OptimizeModule !== 'undefined') {
                        OptimizeModule.drawArray();
                    }
                    if (pageId === 'reports' && typeof ReportsModule !== 'undefined') {
                        ReportsModule.renderReportsList();
                    }
                    if (pageId === 'dashboard' && typeof DashboardModule !== 'undefined') {
                        DashboardModule.refresh();
                    }
                }
            });
        });
    }

    function setupModals() {
        var taskDetailModal = document.getElementById('taskDetailModal');
        var closeTaskDetail = document.getElementById('closeTaskDetail');
        
        if (closeTaskDetail) {
            closeTaskDetail.addEventListener('click', function() {
                taskDetailModal.classList.add('hidden');
            });
        }

        document.querySelectorAll('.modal-overlay').forEach(function(modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.show, .modal-overlay:not(.hidden)').forEach(function(m) {
                    m.classList.add('hidden');
                });
                document.getElementById('notificationPanel').classList.remove('show');
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();
