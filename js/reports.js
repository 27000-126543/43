const ReportsModule = {
    init() {
        this.renderReportsList();
        this.setupExportButtons();
    },

    renderReportsList() {
        var listEl = document.getElementById('reportsList');
        if (!listEl) return;

        if (SimData.reports.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;padding:48px;color:#78909c;grid-column:1/-1;">暂无报告</div>';
            return;
        }

        var self = this;
        var typeIcons = {
            comprehensive: '📊',
            longitudinal: '📈',
            lateral: '📍',
            cherenkov: '💫'
        };

        listEl.innerHTML = SimData.reports.map(function(r) {
            return '<div class="report-card" data-report-id="' + r.id + '">' +
                '<div class="report-icon">' + (typeIcons[r.type] || '📄') + '</div>' +
                '<div class="report-title">' + r.title + '</div>' +
                '<div class="report-meta">' +
                    r.taskId + '<br>' +
                    StateManager.formatDate(r.createdAt) + ' · ' + r.fileSize +
                '</div>' +
                '<div class="report-actions">' +
                    '<button class="btn-secondary" data-action="view">查看</button>' +
                    '<button class="btn-primary" data-action="download">下载</button>' +
                '</div>' +
            '</div>';
        }).join('');

        listEl.querySelectorAll('.report-card').forEach(function(card) {
            card.querySelectorAll('button').forEach(function(btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var reportId = card.getAttribute('data-report-id');
                    var action = btn.getAttribute('data-action');
                    if (action === 'download') {
                        self.downloadReport(reportId);
                    } else {
                        StateManager.showToast('正在打开报告...', 'info');
                    }
                });
            });
        });
    },

    setupExportButtons() {
        var self = this;
        document.getElementById('exportCsvBtn').addEventListener('click', function() { self.exportData('csv'); });
        document.getElementById('exportJsonBtn').addEventListener('click', function() { self.exportData('json'); });
        document.getElementById('generateReportBtn').addEventListener('click', function() { self.generatePDFReport(); });
    },

    getFilteredTasks() {
        var energyMin = parseFloat(document.getElementById('energyMin').value) || 0;
        var energyMax = parseFloat(document.getElementById('energyMax').value) || Infinity;
        var zenithMin = parseFloat(document.getElementById('zenithMin').value) || 0;
        var zenithMax = parseFloat(document.getElementById('zenithMax').value) || 90;
        var atmosphere = document.getElementById('atmosphereFilter').value;
        var dataType = document.getElementById('dataTypeFilter').value;

        return SimData.simulationTasks.filter(function(t) {
            if (t.energy < energyMin || t.energy > energyMax) return false;
            if (t.zenithAngle < zenithMin || t.zenithAngle > zenithMax) return false;
            if (atmosphere !== 'all' && t.atmosphereModel !== atmosphere) return false;
            return true;
        });
    },

    exportData(format) {
        var tasks = this.getFilteredTasks();
        if (tasks.length === 0) {
            StateManager.showToast('没有符合条件的数据可导出', 'warning');
            return;
        }

        if (format === 'csv') {
            this.exportCSV(tasks);
        } else {
            this.exportJSON(tasks);
        }
    },

    exportCSV(tasks) {
        var headers = ['任务ID', '名称', '初级粒子', '能量(eV)', '天顶角(°)', '方位角(°)',
            '大气模型', '观测高度(m)', '状态', 'X_max(g/cm²)', '总粒子数',
            '重建能量(eV)', '触发效率(%)', '重建分辨率(%)', '创建时间'];
        
        var rows = tasks.map(function(t) {
            return [
                t.id, t.name, t.primaryParticle, t.energy, t.zenithAngle.toFixed(2),
                t.azimuthAngle.toFixed(2), t.atmosphereModel, t.observationAltitude.toFixed(0),
                StateManager.STATUS_LABELS[t.status], t.xmax ? t.xmax.toFixed(2) : '',
                t.totalParticles || '', t.reconstructedEnergy || '',
                t.triggerEfficiency ? t.triggerEfficiency.toFixed(2) : '',
                t.reconstructionResolution ? t.reconstructionResolution.toFixed(2) : '',
                t.createdAt
            ].join(',');
        });

        var csv = '\ufeff' + headers.join(',') + '\n' + rows.join('\n');
        this.downloadFile(csv, 'cosmic_ray_simulation_data.csv', 'text/csv');
        StateManager.showToast('CSV 导出成功，共 ' + tasks.length + ' 条记录', 'success');
    },

    exportJSON(tasks) {
        var data = {
            exportTime: new Date().toISOString(),
            filters: {
                energyMin: document.getElementById('energyMin').value,
                energyMax: document.getElementById('energyMax').value,
                zenithMin: document.getElementById('zenithMin').value,
                zenithMax: document.getElementById('zenithMax').value,
                atmosphere: document.getElementById('atmosphereFilter').value,
                dataType: document.getElementById('dataTypeFilter').value
            },
            count: tasks.length,
            tasks: tasks
        };
        this.downloadFile(JSON.stringify(data, null, 2), 'cosmic_ray_simulation_data.json', 'application/json');
        StateManager.showToast('JSON 导出成功，共 ' + tasks.length + ' 条记录', 'success');
    },

    downloadFile(content, filename, mimeType) {
        var blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    generatePDFReport() {
        if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
            StateManager.showToast('PDF 生成库加载中，请稍后重试', 'warning');
            return;
        }

        var tasks = this.getFilteredTasks().filter(function(t) { return t.status === 'completed'; });
        if (tasks.length === 0) {
            StateManager.showToast('没有已完成的模拟任务可生成报告', 'warning');
            return;
        }

        StateManager.showToast('正在生成综合报告 PDF...', 'info');

        var self = this;
        setTimeout(function() {
            try {
                var { jsPDF } = jspdf;
                var doc = new jsPDF();

                doc.setFillColor(26, 35, 126);
                doc.rect(0, 0, 210, 35, 'F');

                doc.setTextColor(255, 255, 255);
                doc.setFontSize(18);
                doc.setFont('helvetica', 'bold');
                doc.text('Cosmic Ray Air Shower Simulation Report', 105, 15, { align: 'center' });
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text('Comprehensive Analysis Report', 105, 23, { align: 'center' });
                doc.setFontSize(9);
                doc.text('Generated: ' + new Date().toLocaleString('zh-CN'), 105, 30, { align: 'center' });

                doc.setTextColor(0, 0, 0);
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('1. Summary Statistics', 14, 48);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                var stats = SimData.getDailyStats();
                doc.text('Total Simulations: ' + stats.totalTasks, 14, 58);
                doc.text('Completion Rate: ' + stats.completionRate + '%', 14, 65);
                doc.text('Average Resolution: ' + stats.resolution + '%', 14, 72);
                doc.text('Trigger Efficiency: ' + stats.triggerEfficiency + '%', 14, 79);
                doc.text('Pending Approvals: ' + stats.pendingApproval, 14, 86);

                var pageWidth = 95;
                doc.text('Tasks Analyzed: ' + tasks.length, pageWidth, 58);
                doc.text('Energy Range: ' + StateManager.formatEnergy(parseFloat(document.getElementById('energyMin').value)) +
                    ' - ' + StateManager.formatEnergy(parseFloat(document.getElementById('energyMax').value)), pageWidth, 65);
                doc.text('Zenith Range: ' + document.getElementById('zenithMin').value + ' - ' + document.getElementById('zenithMax').value + ' deg', pageWidth, 72);
                doc.text('Atmosphere Model: ' + document.getElementById('atmosphereFilter').value, pageWidth, 79);

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('2. Longitudinal Development', 14, 100);

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text('The longitudinal development curve describes the evolution of particle', 14, 108);
                doc.text('number with atmospheric depth. The shower reaches maximum development', 14, 114);
                doc.text('at depth X_max, where the number of particles is maximized.', 14, 120);

                var sampleTask = tasks[0];
                var showerData = SimData.generateShowerData(sampleTask);
                
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text('Sample Task: ' + sampleTask.name + ' (' + sampleTask.id + ')', 14, 132);
                
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text('Primary Particle: ' + sampleTask.primaryParticle, 14, 140);
                doc.text('Initial Energy: ' + StateManager.formatEnergy(sampleTask.energy), 14, 146);
                doc.text('X_max: ' + (sampleTask.xmax ? sampleTask.xmax.toFixed(1) : 'N/A') + ' g/cm^2', 14, 152);
                doc.text('Total Particles: ' + (sampleTask.totalParticles ? sampleTask.totalParticles.toExponential(2) : 'N/A'), 14, 158);
                doc.text('Zenith Angle: ' + sampleTask.zenithAngle.toFixed(1) + ' deg', pageWidth, 140);
                doc.text('Reconstructed Energy: ' + (sampleTask.reconstructedEnergy ? StateManager.formatEnergy(sampleTask.reconstructedEnergy) : 'N/A'), pageWidth, 146);
                doc.text('Muon Fraction: ' + (sampleTask.muonFraction ? sampleTask.muonFraction.toFixed(1) : 'N/A') + '%', pageWidth, 152);
                doc.text('EM Fraction: ' + (sampleTask.emFraction ? sampleTask.emFraction.toFixed(1) : 'N/A') + '%', pageWidth, 158);

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('3. Lateral Distribution', 14, 175);

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text('The lateral distribution function describes the spatial distribution of', 14, 183);
                doc.text('particles at ground level. It typically follows an exponential or power-law', 14, 189);
                doc.text('decrease with distance from the shower core.', 14, 195);

                var n = Math.min(showerData.lateral.radius.length, 8);
                doc.setFontSize(8);
                doc.text('Radius (m)  |  Particle Density', 14, 208);
                for (var i = 0; i < n; i++) {
                    var idx = Math.floor(i * showerData.lateral.radius.length / n);
                    doc.text(
                        String(showerData.lateral.radius[idx]).padEnd(12) + '|  ' +
                        showerData.lateral.density[idx].toExponential(2),
                        14, 216 + i * 6
                    );
                }

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('4. Cherenkov Light Distribution', 14, 273);

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text('Cherenkov radiation is emitted by charged particles traveling faster', 14, 281);
                doc.text('than the speed of light in the atmosphere. The temporal and spatial', 14, 287);
                doc.text('distribution provides important information for shower reconstruction.', 14, 293);

                var peakPhotons = Math.max.apply(null, showerData.cherenkov.photons);
                doc.text('Peak Photons: ' + peakPhotons.toExponential(2), 14, 303);
                doc.text('Spatial Distribution follows exponential decay from shower core.', 14, 310);

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('5. Simulation Results Table', 14, 325);

                var tableData = tasks.slice(0, 8).map(function(t) {
                    return [
                        t.id,
                        StateManager.PARTICLE_LABELS[t.primaryParticle] || t.primaryParticle,
                        StateManager.formatEnergy(t.energy),
                        t.zenithAngle.toFixed(1) + ' deg',
                        t.xmax ? t.xmax.toFixed(0) + ' g/cm2' : 'N/A',
                        t.triggerEfficiency ? t.triggerEfficiency.toFixed(0) + '%' : 'N/A'
                    ];
                });

                if (typeof doc.autoTable === 'function') {
                    doc.autoTable({
                        startY: 333,
                        head: [['ID', 'Particle', 'Energy', 'Zenith', 'X_max', 'Efficiency']],
                        body: tableData,
                        theme: 'grid',
                        styles: { fontSize: 8 },
                        headStyles: { fillColor: [26, 35, 126], textColor: 255 },
                        margin: { left: 14, right: 14 }
                    });
                }

                doc.setFillColor(26, 35, 126);
                doc.rect(0, 285, 210, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(8);
                doc.text('Cosmic Ray Air Shower Simulation Platform - Confidential Report', 105, 290, { align: 'center' });

                var filename = 'Cosmic_Ray_Shower_Report_' + Date.now() + '.pdf';
                doc.save(filename);

                SimData.addReport({
                    id: 'REPORT-' + Date.now(),
                    title: '综合分析报告 ' + new Date().toLocaleDateString('zh-CN'),
                    taskId: tasks.length > 0 ? tasks[0].id : 'N/A',
                    createdAt: new Date().toISOString(),
                    type: 'comprehensive',
                    fileSize: (Math.random() * 3 + 2).toFixed(2) + ' MB'
                });

                self.renderReportsList();
                StateManager.showToast('PDF 报告生成成功！', 'success');
            } catch (e) {
                console.error('PDF生成错误:', e);
                StateManager.showToast('PDF 生成失败: ' + e.message, 'error');
            }
        }, 500);
    },

    downloadReport(reportId) {
        var report = SimData.reports.find(function(r) { return r.id === reportId; });
        if (!report) return;

        if (typeof jspdf !== 'undefined' && jspdf.jsPDF) {
            var { jsPDF } = jspdf;
            var doc = new jsPDF();
            doc.setFontSize(16);
            doc.text(report.title, 105, 50, { align: 'center' });
            doc.setFontSize(10);
            doc.text('Task ID: ' + report.taskId, 105, 65, { align: 'center' });
            doc.text('Created: ' + StateManager.formatDate(report.createdAt), 105, 72, { align: 'center' });
            doc.save(report.title.replace(/\s+/g, '_') + '.pdf');
            StateManager.showToast('报告下载成功', 'success');
        } else {
            StateManager.showToast('PDF 库未加载，正在生成文本报告...', 'info');
            var content = 'Report: ' + report.title + '\nTask: ' + report.taskId + '\nCreated: ' + report.createdAt;
            this.downloadFile(content, report.title.replace(/\s+/g, '_') + '.txt', 'text/plain');
        }
    }
};
