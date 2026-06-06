const UploadModule = {
    eventFiles: [],
    atmosphereFiles: [],

    init() {
        this.setupDragDrop('eventUploadArea', 'eventFileInput', 'eventFileList', 'event');
        this.setupDragDrop('atmosphereUploadArea', 'atmosphereFileInput', 'atmosphereFileList', 'atmosphere');
        
        const startBtn = document.getElementById('startSimulationBtn');
        if (startBtn) {
            startBtn.addEventListener('click', this.startSimulation.bind(this));
        }
    },

    setupDragDrop(areaId, inputId, listId, type) {
        const area = document.getElementById(areaId);
        const input = document.getElementById(inputId);
        const list = document.getElementById(listId);
        
        if (!area || !input || !list) return;

        area.addEventListener('click', function() { input.click(); });
        
        input.addEventListener('change', function(e) {
            this.handleFiles(e.target.files, type, list);
        }.bind(this));

        area.addEventListener('dragover', function(e) {
            e.preventDefault();
            area.classList.add('dragover');
        });

        area.addEventListener('dragleave', function() {
            area.classList.remove('dragover');
        });

        area.addEventListener('drop', function(e) {
            e.preventDefault();
            area.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files, type, list);
        }.bind(this));
    },

    handleFiles(files, type, listEl) {
        const fileArr = Array.from(files);
        if (type === 'event') {
            this.eventFiles = this.eventFiles.concat(fileArr);
        } else {
            this.atmosphereFiles = this.atmosphereFiles.concat(fileArr);
        }
        this.renderFileList(type === 'event' ? this.eventFiles : this.atmosphereFiles, listEl, type);
        StateManager.showToast('已添加 ' + files.length + ' 个文件', 'success');
    },

    renderFileList(files, listEl, type) {
        listEl.innerHTML = '';
        const self = this;
        files.forEach(function(file, idx) {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            const ext = file.name.split('.').pop().toLowerCase();
            let icon = '📄';
            if (['csv'].includes(ext)) icon = '📊';
            else if (['json'].includes(ext)) icon = '📋';
            else if (['root'].includes(ext)) icon = '🔬';
            else if (['yaml', 'yml'].includes(ext)) icon = '⚙️';
            else if (['dat'].includes(ext)) icon = '💾';
            
            item.innerHTML = 
                '<span class="file-icon">' + icon + '</span>' +
                '<div class="file-info">' +
                    '<div class="file-name">' + file.name + '</div>' +
                    '<div class="file-size">' + StateManager.formatFileSize(file.size) + '</div>' +
                '</div>' +
                '<button class="file-remove" data-idx="' + idx + '" data-type="' + type + '">×</button>';
            
            listEl.appendChild(item);
        });

        listEl.querySelectorAll('.file-remove').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-idx'));
                const ftype = btn.getAttribute('data-type');
                if (ftype === 'event') {
                    self.eventFiles.splice(idx, 1);
                    self.renderFileList(self.eventFiles, listEl, 'event');
                } else {
                    self.atmosphereFiles.splice(idx, 1);
                    self.renderFileList(self.atmosphereFiles, listEl, 'atmosphere');
                }
            });
        });
    },

    startSimulation() {
        const primaryType = document.getElementById('primaryType').value;
        const energy = parseFloat(document.getElementById('primaryEnergy').value);
        const zenith = parseFloat(document.getElementById('zenithAngle').value);
        const azimuth = parseFloat(document.getElementById('azimuthAngle').value);
        const atmosphere = document.getElementById('atmosphereModel').value;
        const altitude = parseFloat(document.getElementById('observationAltitude').value);
        
        if (!energy || energy <= 0) {
            StateManager.showToast('请输入有效的初始能量', 'error');
            return;
        }
        if (zenith < 0 || zenith > 90) {
            StateManager.showToast('天顶角必须在 0-90° 之间', 'error');
            return;
        }

        const taskId = 'TASK-' + Date.now().toString().slice(-6);
        const newTask = {
            id: taskId,
            name: '模拟任务 ' + new Date().toLocaleDateString('zh-CN'),
            primaryParticle: primaryType,
            energy: energy,
            zenithAngle: zenith,
            azimuthAngle: azimuth,
            atmosphereModel: atmosphere,
            observationAltitude: altitude,
            status: 'pending',
            progress: 0,
            createdAt: new Date().toISOString(),
            xmax: 0,
            totalParticles: 0,
            muonFraction: 0,
            emFraction: 0,
            physicistApproved: false,
            engineerApproved: false,
            pushedToOptimization: false,
            deviationAlert: false,
            eventFiles: this.eventFiles.map(function(f) { return f.name; }),
            atmosphereFiles: this.atmosphereFiles.map(function(f) { return f.name; })
        };

        SimData.addTask(newTask);
        StateManager.showToast('任务创建成功！开始自动执行...', 'success');
        
        this.eventFiles = [];
        this.atmosphereFiles = [];
        document.getElementById('eventFileList').innerHTML = '';
        document.getElementById('atmosphereFileList').innerHTML = '';
        
        this.autoAdvanceTask(taskId);
        
        if (typeof TasksModule !== 'undefined' && TasksModule.render) {
            TasksModule.render();
        }
    },

    autoAdvanceTask(taskId) {
        const statuses = ['validating', 'simulating', 'detecting', 'reconstructing', 'completed'];
        let idx = 0;
        
        function step() {
            if (idx >= statuses.length) return;
            
            const updated = StateManager.advanceStatus(taskId);
            if (updated && updated.status === 'simulating') {
                StateManager.checkThresholds(taskId);
            }
            
            if (typeof TasksModule !== 'undefined' && TasksModule.render) {
                TasksModule.render();
            }
            if (typeof MonitorModule !== 'undefined' && MonitorModule.updateMetrics) {
                MonitorModule.updateMetrics();
            }
            
            idx++;
            if (idx < statuses.length) {
                setTimeout(step, 2000 + Math.random() * 1500);
            }
        }
        
        setTimeout(step, 1000);
    }
};
