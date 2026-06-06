const FileParser = {
    parseCSV(text) {
        const lines = text.trim().split(/\r?\n/);
        if (lines.length === 0) return null;

        const header = lines[0].split(/[,;\t|]/).map(h => h.trim().toLowerCase());
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            const values = lines[i].split(/[,;\t|]/).map(v => v.trim());
            const row = {};
            header.forEach((h, idx) => {
                if (h && values[idx] !== undefined) {
                    row[h] = values[idx];
                }
            });
            data.push(row);
        }

        return { header, data, raw: text };
    },

    parseJSON(text) {
        try {
            const parsed = JSON.parse(text);
            if (Array.isArray(parsed)) {
                return { header: parsed.length > 0 ? Object.keys(parsed[0]) : [], data: parsed, raw: text };
            } else if (typeof parsed === 'object') {
                if (parsed.data && Array.isArray(parsed.data)) {
                    return { 
                        header: parsed.data.length > 0 ? Object.keys(parsed.data[0]) : [], 
                        data: parsed.data, 
                        meta: parsed.meta || parsed.metadata || {},
                        raw: text 
                    };
                }
                return { header: Object.keys(parsed), data: [parsed], raw: text };
            }
        } catch (e) {
            return null;
        }
        return null;
    },

    extractEventParams(parsed, defaultParams) {
        if (!parsed || !parsed.data || parsed.data.length === 0) {
            return defaultParams;
        }

        const firstRow = parsed.data[0];
        const params = Object.assign({}, defaultParams);
        const header = parsed.header || [];
        const hdrMap = {};
        header.forEach(h => hdrMap[h.toLowerCase()] = h);

        function findVal(keywords) {
            for (const kw of keywords) {
                if (firstRow[kw] !== undefined && firstRow[kw] !== null && firstRow[kw] !== '') {
                    return firstRow[kw];
                }
                for (const h of header) {
                    if (h.toLowerCase().includes(kw) && firstRow[h] !== undefined) {
                        return firstRow[h];
                    }
                }
            }
            return undefined;
        }

        const energyRaw = findVal(['energy', 'e0', 'primary_energy', 'initial_energy', 'energie', '粒子能量', '初始能量', '能量']);
        if (energyRaw !== undefined) {
            let energy = parseFloat(energyRaw);
            const energyStr = String(energyRaw).toLowerCase();
            if (energyStr.includes('eev') || energyStr.includes('1e18')) {
                energy = energy * 1e18;
            } else if (energyStr.includes('pev') || energyStr.includes('1e15')) {
                energy = energy * 1e15;
            } else if (energyStr.includes('tev') || energyStr.includes('1e12')) {
                energy = energy * 1e12;
            } else if (energyStr.includes('gev') || energyStr.includes('1e9')) {
                energy = energy * 1e9;
            } else if (energy < 1e5) {
                energy = energy * 1e15;
            }
            if (!isNaN(energy) && energy > 0) {
                params.energy = energy;
            }
        }

        const particleRaw = findVal(['particle', 'primary', 'primary_type', 'primary_particle', 'type', '粒子', '初级粒子', '粒子类型']);
        if (particleRaw !== undefined) {
            const p = String(particleRaw).toLowerCase();
            if (p.includes('gamma') || p.includes('γ') || p.includes('光子') || p.includes('伽马')) params.primaryParticle = 'gamma';
            else if (p.includes('proton') || p.includes('p+') || p === 'p' || p.includes('质子')) params.primaryParticle = 'proton';
            else if (p.includes('helium') || p.includes('he') || p.includes('氦') || p.includes('alpha')) params.primaryParticle = 'helium';
            else if (p.includes('iron') || p.includes('fe') || p.includes('铁')) params.primaryParticle = 'iron';
        }

        const zenithRaw = findVal(['zenith', 'zenith_angle', 'theta', '天顶角', '天顶']);
        if (zenithRaw !== undefined) {
            const z = parseFloat(zenithRaw);
            if (!isNaN(z) && z >= 0 && z <= 90) params.zenithAngle = z;
        }

        const azimuthRaw = findVal(['azimuth', 'azimuth_angle', 'phi', '方位角']);
        if (azimuthRaw !== undefined) {
            const a = parseFloat(azimuthRaw);
            if (!isNaN(a)) params.azimuthAngle = a % 360;
        }

        const atmoRaw = findVal(['atmosphere', 'atmosphere_model', 'atmo', '大气', '大气模型']);
        if (atmoRaw !== undefined) {
            const a = String(atmoRaw).toUpperCase();
            if (a.includes('LINSLEY')) params.atmosphereModel = 'Linsley';
            else if (a.includes('MSIS')) params.atmosphereModel = 'MSIS';
            else if (a.includes('US76') || a.includes('US') || a.includes('STANDARD')) params.atmosphereModel = 'US76';
        }

        const altRaw = findVal(['altitude', 'obs_level', 'observation_altitude', 'height', '海拔', '观测高度', '高度']);
        if (altRaw !== undefined) {
            const alt = parseFloat(altRaw);
            if (!isNaN(alt) && alt > 0) {
                if (alt < 100) params.observationAltitude = alt * 1000;
                else params.observationAltitude = alt;
            }
        }

        const xmaxRaw = findVal(['xmax', 'x_max', '最大深度', '簇射最大深度']);
        if (xmaxRaw !== undefined) {
            const xv = parseFloat(xmaxRaw);
            if (!isNaN(xv)) params._xmaxOverride = xv;
        }

        const npartRaw = findVal(['nparticles', 'n_particles', 'total_particles', 'n_total', '粒子数']);
        if (npartRaw !== undefined) {
            const nv = parseFloat(npartRaw);
            if (!isNaN(nv) && nv > 0) params._npartOverride = nv;
        }

        params._fileEventCount = parsed.data.length;
        params._fileColumns = header;
        params._fileName = parsed.fileName || 'uploaded';

        return params;
    },

    parseAtmosphereFile(text, fileName) {
        const lines = text.trim().split(/\r?\n/);
        const altitudes = [];
        const densities = [];
        const temperatures = [];
        let parsedData = null;

        try {
            parsedData = JSON.parse(text);
        } catch (e) {}

        if (parsedData && typeof parsedData === 'object') {
            const h = parsedData.h || parsedData.altitude || parsedData.height || [];
            const rho = parsedData.rho || parsedData.density || [];
            const t = parsedData.t || parsedData.temperature || [];
            h.forEach(v => altitudes.push(parseFloat(v)));
            rho.forEach(v => densities.push(parseFloat(v)));
            t.forEach(v => temperatures.push(parseFloat(v)));
        } else {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line || line.startsWith('#') || line.startsWith('%') || line.startsWith('//')) continue;
                const parts = line.split(/[,;\t\s]+/).map(p => p.trim());
                const nums = parts.map(p => parseFloat(p)).filter(p => !isNaN(p));
                if (nums.length >= 2) {
                    altitudes.push(nums[0]);
                    densities.push(nums[1]);
                    if (nums.length >= 3) temperatures.push(nums[2]);
                }
            }
        }

        if (altitudes.length < 2) {
            return { valid: false, error: '无法解析大气模型数据，至少需要两层高度数据' };
        }

        return {
            valid: true,
            fileName: fileName,
            name: 'Custom (' + fileName + ')',
            h0: 6.5e5,
            h: altitudes,
            rho: densities,
            t: temperatures.length > 0 ? temperatures : altitudes.map(() => 250),
            layers: altitudes.length
        };
    }
};

const UploadModule = {
    eventFiles: [],
    atmosphereFiles: [],
    parsedEventParams: null,
    parsedAtmosphereModels: [],

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

        const self = this;

        area.addEventListener('click', function() { input.click(); });
        
        input.addEventListener('change', function(e) {
            self.handleFiles(e.target.files, type, list);
        });

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
            self.handleFiles(e.dataTransfer.files, type, list);
        });
    },

    async handleFiles(files, type, listEl) {
        const fileArr = Array.from(files);
        
        for (const file of fileArr) {
            try {
                const content = await this.readFile(file);
                
                if (type === 'event') {
                    const parsed = this.parseEventFile(content, file.name, file.type);
                    if (parsed) {
                        this.parsedEventParams = FileParser.extractEventParams(parsed, {
                            energy: parseFloat(document.getElementById('primaryEnergy').value),
                            primaryParticle: document.getElementById('primaryType').value,
                            zenithAngle: parseFloat(document.getElementById('zenithAngle').value),
                            azimuthAngle: parseFloat(document.getElementById('azimuthAngle').value),
                            atmosphereModel: document.getElementById('atmosphereModel').value,
                            observationAltitude: parseFloat(document.getElementById('observationAltitude').value)
                        });
                        
                        this.applyParsedParamsToForm(this.parsedEventParams);
                        
                        this.eventFiles.push({
                            file: file,
                            content: content,
                            parsed: parsed,
                            params: this.parsedEventParams
                        });
                        
                        StateManager.showToast(
                            '文件 "' + file.name + '" 解析成功！提取到 ' + parsed.data.length + ' 条事件，参数已自动填充',
                            'success'
                        );
                    } else {
                        this.eventFiles.push({ file: file, content: content, parsed: null });
                        StateManager.showToast('文件 "' + file.name + '" 已添加（未能自动解析参数）', 'info');
                    }
                } else {
                    const atmo = FileParser.parseAtmosphereFile(content, file.name);
                    if (atmo.valid) {
                        this.parsedAtmosphereModels.push(atmo);
                        this.atmosphereFiles.push({ file: file, content: content, model: atmo });
                        
                        const select = document.getElementById('atmosphereModel');
                        if (select) {
                            const optVal = 'custom_' + this.parsedAtmosphereModels.length;
                            const opt = document.createElement('option');
                            opt.value = optVal;
                            opt.textContent = atmo.name + ' (' + atmo.layers + '层)';
                            select.appendChild(opt);
                            select.value = optVal;
                        }
                        
                        StateManager.showToast(
                            '大气模型 "' + file.name + '" 解析成功！共 ' + atmo.layers + ' 层数据，已设为当前模型',
                            'success'
                        );
                    } else {
                        this.atmosphereFiles.push({ file: file, content: content, model: null });
                        StateManager.showToast('大气模型文件 "' + file.name + '" 解析失败: ' + (atmo.error || '未知错误'), 'error');
                    }
                }
            } catch (e) {
                console.error('文件读取错误:', e);
                StateManager.showToast('文件读取失败: ' + e.message, 'error');
            }
        }
        
        if (type === 'event') {
            this.renderFileList(this.eventFiles, listEl, 'event');
        } else {
            this.renderFileList(this.atmosphereFiles, listEl, 'atmosphere');
        }
    },

    readFile(file) {
        return new Promise(function(resolve, reject) {
            const reader = new FileReader();
            reader.onload = function(e) { resolve(e.target.result); };
            reader.onerror = function(e) { reject(e.target.error); };
            reader.readAsText(file, 'UTF-8');
        });
    },

    parseEventFile(content, fileName, fileType) {
        const ext = fileName.split('.').pop().toLowerCase();
        
        if (ext === 'json' || fileType === 'application/json') {
            const parsed = FileParser.parseJSON(content);
            if (parsed) parsed.fileName = fileName;
            return parsed;
        } else if (['csv', 'txt', 'dat', 'tsv'].includes(ext)) {
            const parsed = FileParser.parseCSV(content);
            if (parsed) parsed.fileName = fileName;
            return parsed;
        }
        
        const csvParsed = FileParser.parseCSV(content);
        if (csvParsed && csvParsed.header.length > 0) {
            csvParsed.fileName = fileName;
            return csvParsed;
        }
        
        return null;
    },

    applyParsedParamsToForm(params) {
        if (!params) return;
        
        if (params.energy !== undefined) {
            const el = document.getElementById('primaryEnergy');
            if (el) el.value = params.energy;
        }
        if (params.primaryParticle !== undefined) {
            const el = document.getElementById('primaryType');
            if (el) el.value = params.primaryParticle;
        }
        if (params.zenithAngle !== undefined) {
            const el = document.getElementById('zenithAngle');
            if (el) el.value = params.zenithAngle;
        }
        if (params.azimuthAngle !== undefined) {
            const el = document.getElementById('azimuthAngle');
            if (el) el.value = params.azimuthAngle;
        }
        if (params.atmosphereModel !== undefined) {
            const el = document.getElementById('atmosphereModel');
            if (el) {
                const existing = Array.from(el.options).find(o => o.value === params.atmosphereModel);
                if (existing) el.value = params.atmosphereModel;
            }
        }
        if (params.observationAltitude !== undefined) {
            const el = document.getElementById('observationAltitude');
            if (el) el.value = params.observationAltitude;
        }
    },

    renderFileList(files, listEl, type) {
        listEl.innerHTML = '';
        const self = this;
        files.forEach(function(item, idx) {
            const file = item.file;
            const ext = file.name.split('.').pop().toLowerCase();
            let icon = '📄';
            if (['csv', 'tsv'].includes(ext)) icon = '📊';
            else if (['json'].includes(ext)) icon = '📋';
            else if (['root'].includes(ext)) icon = '🔬';
            else if (['yaml', 'yml'].includes(ext)) icon = '⚙️';
            else if (['dat'].includes(ext)) icon = '💾';
            
            let parseInfo = '';
            if (type === 'event' && item.parsed) {
                const cols = item.parsed.header ? item.parsed.header.slice(0, 5).join(', ') : '';
                parseInfo = ' · ' + item.parsed.data.length + '条 · ' + (cols.length > 30 ? cols.slice(0, 30) + '...' : cols);
            } else if (type === 'atmosphere' && item.model) {
                parseInfo = ' · ' + item.model.layers + '层';
            }
            
            const itemEl = document.createElement('div');
            itemEl.className = 'file-item';
            itemEl.innerHTML = 
                '<span class="file-icon">' + icon + '</span>' +
                '<div class="file-info">' +
                    '<div class="file-name">' + file.name + '</div>' +
                    '<div class="file-size">' + StateManager.formatFileSize(file.size) + parseInfo + '</div>' +
                '</div>' +
                '<button class="file-remove" data-idx="' + idx + '" data-type="' + type + '">×</button>';
            
            listEl.appendChild(itemEl);
        });

        listEl.querySelectorAll('.file-remove').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-idx'));
                const ftype = btn.getAttribute('data-type');
                if (ftype === 'event') {
                    self.eventFiles.splice(idx, 1);
                    if (self.eventFiles.length === 0) self.parsedEventParams = null;
                    self.renderFileList(self.eventFiles, listEl, 'event');
                } else {
                    self.atmosphereFiles.splice(idx, 1);
                    self.renderFileList(self.atmosphereFiles, listEl, 'atmosphere');
                }
            });
        });
    },

    startSimulation() {
        let params = {
            primaryParticle: document.getElementById('primaryType').value,
            energy: parseFloat(document.getElementById('primaryEnergy').value),
            zenithAngle: parseFloat(document.getElementById('zenithAngle').value),
            azimuthAngle: parseFloat(document.getElementById('azimuthAngle').value),
            atmosphereModel: document.getElementById('atmosphereModel').value,
            observationAltitude: parseFloat(document.getElementById('observationAltitude').value)
        };

        if (this.parsedEventParams) {
            Object.assign(params, this.parsedEventParams);
        }

        if (!params.energy || params.energy <= 0) {
            StateManager.showToast('请输入有效的初始能量', 'error');
            return;
        }
        if (params.zenithAngle < 0 || params.zenithAngle > 90) {
            StateManager.showToast('天顶角必须在 0-90° 之间', 'error');
            return;
        }

        const customAtmoIdx = params.atmosphereModel.startsWith('custom_') ? 
            parseInt(params.atmosphereModel.replace('custom_', '')) - 1 : -1;
        if (customAtmoIdx >= 0 && this.parsedAtmosphereModels[customAtmoIdx]) {
            const custom = this.parsedAtmosphereModels[customAtmoIdx];
            const modelKey = 'CUSTOM_' + Date.now();
            PhysicsModels.ATMOSPHERE_MODELS[modelKey] = {
                name: custom.name,
                h0: custom.h0,
                h: custom.h,
                rho: custom.rho,
                t: custom.t
            };
            params.atmosphereModel = modelKey;
        }

        StateManager.showToast('正在运行真实物理模拟...', 'info');
        
        const simResults = SimData.runFullSimulation(params);

        const taskId = 'TASK-' + Date.now().toString().slice(-6);
        const newTask = {
            id: taskId,
            name: '模拟任务 ' + new Date().toLocaleDateString('zh-CN') + ' [' + StateManager.formatEnergy(params.energy) + ']',
            primaryParticle: params.primaryParticle,
            energy: params.energy,
            zenithAngle: params.zenithAngle,
            azimuthAngle: params.azimuthAngle,
            atmosphereModel: params.atmosphereModel,
            observationAltitude: params.observationAltitude,
            status: 'pending',
            progress: 0,
            createdAt: new Date().toISOString(),
            xmax: simResults.xmax,
            totalParticles: simResults.totalParticles,
            muonFraction: simResults.muonFraction,
            emFraction: simResults.emFraction,
            physicistApproved: false,
            engineerApproved: false,
            pushedToOptimization: false,
            reconstructedEnergy: simResults.reconstructedEnergy,
            reconstructionResolution: simResults.reconstructionResolution,
            triggerEfficiency: simResults.triggerEfficiency,
            deviationAlert: false,
            showerData: simResults.showerData,
            eventFiles: this.eventFiles.map(function(f) { return f.file.name; }),
            atmosphereFiles: this.atmosphereFiles.map(function(f) { return f.file.name; }),
            eventCount: this.parsedEventParams ? this.parsedEventParams._fileEventCount : 0
        };

        SimData.addTask(newTask);
        StateManager.showToast(
            '任务创建成功！真实模拟完成：X_max=' + simResults.xmax.toFixed(1) + 
            ' g/cm², 粒子数=' + simResults.totalParticles.toExponential(2),
            'success'
        );
        
        this.eventFiles = [];
        this.parsedEventParams = null;
        document.getElementById('eventFileList').innerHTML = '';
        
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
                setTimeout(step, 1500 + Math.random() * 1000);
            }
        }
        
        setTimeout(step, 800);
    }
};
