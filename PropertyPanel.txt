class PropertyPanel {
    constructor(system) {
        this.system = system;
        this.selectedNode = null; 
        this.selectedComponent = null;
        
        this.btnConnectGear = null;
        this.btnConnectPulley = null;
        this.btnConnectRack = null;

        // --- ESTILO COMPACTO ---
        this.container = createDiv();
        this.container.position(620, 10);
        this.container.style("width", "280px");
        this.container.style("padding", "8px");
        this.container.style("border", "1px solid #bbb");
        this.container.style("border-radius", "6px");
        this.container.style("background", "#fafafa");
        this.container.style("font-family", "'Segoe UI', Arial, sans-serif");
        this.container.style("font-size", "11px");
        this.container.style("color", "#333");
        this.container.style("box-shadow", "0 1px 3px rgba(0,0,0,0.1)");

        this.header = createDiv("<b>⚙️ Sistema Mecánico</b>");
        this.header.parent(this.container);
        this.header.style("margin-bottom", "6px");
        this.header.style("font-size", "13px");
        this.header.style("color", "#2c3e50");
        this.header.style("border-bottom", "1px solid #ddd");
        this.header.style("padding-bottom", "4px");

        this.nodeInfo = createDiv("<i style='color:#888;'>Sin selección</i>");
        this.nodeInfo.parent(this.container);
        this.nodeInfo.style("margin-bottom", "6px");
        this.nodeInfo.style("font-size", "11px");

        this.componentList = createDiv();
        this.componentList.parent(this.container);
        this.componentList.style("margin-bottom", "6px");

        this.editor = createDiv();
        this.editor.parent(this.container);

        this.update();
    }

    update() {
        this.updateNodeInfo();
        this.updateComponentList();
        this.updateEditor();
    }

    setSelection(node) {
        if (this.selectedNode) this.selectedNode.selected = false;
        this.selectedNode = node; 
        if (node) {
            node.selected = true;
            this.selectedComponent = node.components.length > 0 ? node.components[0] : null;
        } else {
            this.selectedComponent = null;
        }
        this.update();
    }

    selectComponent(comp) {
        this.selectedComponent = comp;
        this.update();
    }

    updateNodeInfo() {
        if (!this.selectedNode) {
            this.nodeInfo.html("<i style='color:#888;'>Sin selección</i>");
            return;
        }
        let n = this.selectedNode;
        let tipo = (n instanceof LinearGuide) ? "📏 Guía" : "🔵 Eje";
        let vel = (n instanceof LinearGuide) ? `v: ${nf(n.linearVelocity, 1, 1)}` : `ω: ${nf(n.omega, 1, 1)}`;
        let motorTag = n.isDriver ? " <span style='color:#e67e22; font-weight:bold;'>[⚡MOTOR]</span>" : "";
        
        this.nodeInfo.html(`${tipo} X:${nf(n.x,1,0)} Y:${nf(n.y,1,0)} ${vel}${motorTag}`);
    }

    updateComponentList() {
        this.componentList.html("");
        if (!this.selectedNode) return;

        let displayList = [...this.selectedNode.components];
        for (let comp of this.selectedNode.components) {
            for (let mesh of this.system.rackMeshes) {
                if (mesh.pinion === comp) displayList.push(mesh.rack); 
            }
        }

        if (displayList.length === 0) return;

        let row = createDiv("");
        row.parent(this.componentList);
        row.style("display", "flex");
        row.style("gap", "4px");
        row.style("flex-wrap", "wrap");

        for (let comp of displayList) {
            let isExternal = !this.selectedNode.components.includes(comp);
            let name = isExternal ? "↳" + comp.name : comp.name;
            let bgColor = "#e8e8e8";
            let textColor = "#333";

            if (comp instanceof Gear) { bgColor = "#d5f5e3"; textColor = "#1e8449"; }
            else if (comp instanceof Pulley) { bgColor = "#d4e6f1"; textColor = "#2471a3"; }
            else if (comp instanceof Rack) { bgColor = "#fdebd0"; textColor = "#ca6f1e"; }

            let btn = createDiv(name);
            btn.parent(row);
            btn.style("background", comp === this.selectedComponent ? "#aed6f1" : bgColor);
            btn.style("color", textColor);
            btn.style("padding", "2px 6px");
            btn.style("border-radius", "3px");
            btn.style("cursor", "pointer");
            btn.style("font-size", "10px");
            if(isExternal) btn.style("font-style", "italic");
            btn.mousePressed(() => this.selectComponent(comp));
        }
    }

    updateEditor() {
        this.editor.html("");
        
        // ==========================================
        // ESTADO 1: Lienzo vacío
        // ==========================================
        if (!this.selectedNode) {
            if (this.system.shafts.length === 0 && this.system.guides.length === 0) {
                let btn = createButton("➕ Crear Primer Eje");
                btn.parent(this.editor);
                this.styleBtn(btn, "#3498db");
                btn.mousePressed(() => {
                    let shaft = this.system.createShaft(width / 2, height / 2);
                    this.setSelection(shaft);
                });
                this.drawPersistenceUI(); 
                this.drawAudioUI();
                return; 
            } 
            
            // ==========================================
            // ESTADO 2: Hay elementos, pero nada seleccionado
            // ==========================================
            else {
                let msg = createDiv("<i style='color:#888; font-size:10px;'>Haz clic en un eje o guía para ver sus propiedades.</i>");
                msg.parent(this.editor);
                
                let btn = createButton("➕ Nuevo Eje");
                btn.parent(this.editor);
                this.styleBtn(btn, "#95a5a6");
                btn.mousePressed(() => {
                    let shaft = this.system.createShaft(width / 2, height / 2);
                    this.setSelection(shaft);
                });
                this.drawPersistenceUI(); 
                this.drawAudioUI();
                return; 
            }
        }
        
        // ==========================================
        // ESTADO 3: Hay un nodo seleccionado (Eje o Guía)
        // ==========================================
        
        // --- SECCIÓN CREACIÓN (Compacta) ---
        this.addSectionTitle("➕ Añadir / Crear");
        let creationRow = createDiv();
        creationRow.parent(this.editor);
        creationRow.style("display", "flex");
        creationRow.style("gap", "4px");
        creationRow.style("margin-bottom", "6px");

        if (this.selectedNode instanceof LinearGuide) {
            let b = createButton("📏 Cremallera"); b.parent(creationRow); this.styleBtn(b, "#f39c12");
            b.mousePressed(() => { let r = this.system.createRack(10, 5); this.system.mountRack(r, this.selectedNode); this.selectedComponent = r; this.update(); });
        } else {
            let selectType = createSelect();
            selectType.parent(creationRow);
            selectType.option("⚙️ Engranaje"); selectType.option("⭕ Polea"); selectType.option("📏 Cre.+Guía");
            selectType.style("font-size", "10px"); selectType.style("flex", "1");
            
            let bAdd = createButton("Añadir"); bAdd.parent(creationRow); this.styleBtn(bAdd, "#3498db");
            bAdd.mousePressed(() => {
                let t = selectType.value();
                if (t.includes("Engranaje")) { let g = this.system.addGearToShaft(this.selectedNode); this.selectedComponent = g; }
                else if (t.includes("Polea")) { let p = this.system.createPulley("", 30); this.system.mountPulley(p, this.selectedNode); this.selectedComponent = p; }
                else if (t.includes("Crem")) { let g = this.system.createGuide(this.selectedNode.x, this.selectedNode.y+80); let r = this.system.createRack(10,5); this.system.mountRack(r, g); this.selectedComponent = r; }
                this.update();
            });

            let bShaft = createButton("🔵 Eje"); bShaft.parent(creationRow); this.styleBtn(bShaft, "#95a5a6");
            bShaft.mousePressed(() => this.setSelection(this.system.createShaftAt(this.selectedNode.x + 80, this.selectedNode.y)));
            
            let bBranch = createButton("🌿 Rama"); bBranch.parent(creationRow); this.styleBtn(bBranch, "#8e44ad");
            bBranch.mousePressed(() => { let g = this.system.addBranchFromMotor(30); if(g) this.setSelection(g.shaft); this.update(); });
        }

        this.addSeparator();

        // --- SECCIÓN CONTROL DEL EJE ---
        this.addSectionTitle("🔧 Control del Eje");
        let controlRow = createDiv();
        controlRow.parent(this.editor);
        controlRow.style("display", "flex");
        controlRow.style("gap", "4px");
        controlRow.style("align-items", "center");
        controlRow.style("margin-bottom", "4px");

        let currentVel = this.selectedNode instanceof LinearGuide ? this.selectedNode.linearVelocity : this.selectedNode.omega;
        let velInput = createInput(str(currentVel), "number");
        velInput.parent(controlRow);
        velInput.attribute("step", "0.1");
        velInput.style("width", "55px"); 
        velInput.style("font-size", "11px"); 
        velInput.style("padding", "5px");
        velInput.style("appearance", "textfield"); 
        velInput.style("-moz-appearance", "textfiel"); 
        velInput.style("-webkit-appearance", "none"); 
        velInput.style("margin", "0");

        velInput.input(() => {
            let val = float(velInput.value());
            if (!isNaN(val)) {
                if (this.selectedNode instanceof LinearGuide) {
                    this.selectedNode.linearVelocity = val;
                } else {
                    this.selectedNode.omega = val;
                }
                this.selectedNode.isDriver = (val !== 0);
                
                if (this.btnMotor) {
                    this.btnMotor.html(this.selectedNode.isDriver ? "⚡ ON" : "⚡ OFF");
                    this.styleBtn(this.btnMotor, this.selectedNode.isDriver ? "#e67e22" : "#bdc3c7");
                    this.btnMotor.style("width", "55px");
                }
                this.updateNodeInfo(); 
            }
        });
        
        let bMotor = createButton(this.selectedNode.isDriver ? "⚡ ON" : "⚡ OFF");
        bMotor.parent(controlRow); 
        this.styleBtn(bMotor, this.selectedNode.isDriver ? "#e67e22" : "#bdc3c7");
        bMotor.style("width", "55px");
        this.btnMotor = bMotor;
        bMotor.mousePressed(() => {
            this.selectedNode.isDriver = !this.selectedNode.isDriver;
            if (!this.selectedNode.isDriver) { 
                this.selectedNode.omega = 0; 
                if (this.selectedNode instanceof LinearGuide) this.selectedNode.linearVelocity = 0;
            } else { 
                if (this.selectedNode.omega === 0) { 
                    this.selectedNode.omega = 2; 
                    if (this.selectedNode instanceof LinearGuide) this.selectedNode.linearVelocity = 50; 
                }
            }
            this.update();
        });

        let bOrbit = createButton("🌀 Orbita");
        bOrbit.parent(controlRow); 
        this.styleBtn(bOrbit, "#d35400"); 
        bOrbit.style("width", "60px");
        bOrbit.mousePressed(() => {
            for (let c of this.system.carriers) {
                if (c.attachedShafts.includes(this.selectedNode)) {
                    c.isDriver = !c.isDriver;
                    this.update();
                    return;
                }
            }
            let center = this.system.findCenterShaftFor(this.selectedNode);
            if (center) { this.system.createCarrier(center, this.selectedNode); this.update(); }
            else console.warn("No está engranado.");
        });

        this.addSeparator();

        // --- SECCIÓN PROPIEDADES DEL COMPONENTE ---
        if (this.selectedComponent) {
            this.addSectionTitle("⚙️ Propiedades");
            
            let fieldsRow = createDiv();
            fieldsRow.parent(this.editor);
            fieldsRow.style("display", "flex"); fieldsRow.style("gap", "4px"); fieldsRow.style("margin-bottom", "4px");

            let nameIn = createInput(this.selectedComponent.name); nameIn.parent(fieldsRow);
            nameIn.style("width", "60px"); nameIn.style("font-size", "10px"); nameIn.style("padding", "5px");
            nameIn.input(() => { this.selectedComponent.name = nameIn.value(); this.updateComponentList(); });

            if (this.selectedComponent instanceof Gear) {
                let dIn = createInput(str(this.selectedComponent.teeth), "number"); dIn.parent(fieldsRow);
                dIn.attribute("step", "1"); dIn.style("width", "35px"); dIn.style("font-size", "10px"); dIn.style("padding", "5px");
                dIn.input(() => { if(float(dIn.value())>=4) this.system.updateGearTeeth(this.selectedComponent, float(dIn.value())); });
                
                let mIn = createInput(str(this.selectedComponent.module), "number"); mIn.parent(fieldsRow);
                mIn.attribute("step", "0.5"); mIn.style("width", "35px"); mIn.style("font-size", "10px"); mIn.style("padding", "5px");
                mIn.input(() => { if(float(mIn.value())>0) this.system.updateGearModule(this.selectedComponent, float(mIn.value())); });

                let lblD = createElement("span", "D:"); lblD.parent(fieldsRow); lblD.style("font-size","9px");
                let lblM = createElement("span", "M:"); lblM.parent(fieldsRow); lblD.style("font-size","9px");
            } 
            else if (this.selectedComponent instanceof Pulley) {
                let rIn = createInput(str(this.selectedComponent.radius), "number"); rIn.parent(fieldsRow);
                rIn.attribute("step", "1"); rIn.style("width", "40px"); rIn.style("font-size", "10px"); rIn.style("padding", "5px");
                rIn.input(() => { if(float(rIn.value())>0) this.system.updatePulleyRadius(this.selectedComponent, float(rIn.value())); });
            }

            let actionRow = createDiv();
            actionRow.parent(this.editor);
            actionRow.style("display", "flex"); actionRow.style("gap", "3px"); actionRow.style("flex-wrap", "wrap"); actionRow.style("margin-bottom", "4px");

            if (this.selectedComponent instanceof Gear) {
                this.btnConnectGear = this.addBtn(actionRow, "🔗 Eng", "#8e44ad", () => { 
                    this.clearActiveStyles(this.btnConnectGear); 
                    this.setActiveStyle(this.btnConnectGear); 
                    this.system.beginConnection(this.selectedComponent); 
                });
                
                this.btnConnectRack = this.addBtn(actionRow, "🔗 Cre", "#8e44ad", () => { 
                    this.clearActiveStyles(this.btnConnectRack); 
                    this.setActiveStyle(this.btnConnectRack); 
                    this.system.beginRackConnection(this.selectedComponent); 
                });
                
                this.addBtn(actionRow, "⭕ Corona", "#7f8c8d", () => { 
                    let sun = this.system.findCenterShaftFor(this.selectedNode); let sT = sun ? sun.components[0].teeth : 30; 
                    let pT = this.selectedComponent.teeth; let a = this.system.createAnnulus(sT + (2 * pT), this.selectedComponent.module); 
                    if(sun){a.shaft.x=sun.x; a.shaft.y=sun.y;} this.system.createInternalMesh(this.selectedComponent, a); this.update();
                });
                
                let isEsc = this.system.escapements.some(e => e.escapeGear === this.selectedComponent);
                if (!isEsc) {
                    this.addBtn(actionRow, "⏱️ Escape", "#c0392b", () => {
                        if (this.system.pendulums.length === 0) { console.warn("Sin péndulos."); return; }
                        if (this.system.pendulums.length === 1) {
                            this.system.createEscapement(this.system.pendulums[0].shaft, this.selectedComponent); this.update();
                        } else {
                            this.system.pendulumSelectionMode = true; this.system.pendingEscapeGear = this.selectedComponent; this.update(); 
                        }
                    });
                }
                let isMin = (this.system.minuteHandShaft && this.system.minuteHandShaft.components.includes(this.selectedComponent));
                if (isMin && !this.system.hourHandShaft) this.addBtn(actionRow, "⏱️ Min", "#2980b9", () => { this.system.addMinuteHandTrain(this.selectedComponent); this.update(); });
                let isEscapeBase = this.system.escapements.some(e => e.escapeGear === this.selectedComponent);
                if (isEscapeBase && !this.system.minuteHandShaft) this.addBtn(actionRow, "⏱️ Hora", "#27ae60", () => { this.system.addHourHandTrain(this.selectedComponent); this.update(); });
            }
            else if (this.selectedComponent instanceof Pulley) {
                this.btnConnectPulley = this.addBtn(actionRow, "🔗 Polea", "#8e44ad", () => { 
                    this.clearActiveStyles(this.btnConnectPulley); 
                    this.setActiveStyle(this.btnConnectPulley); 
                    this.system.beginPulleyConnection(this.selectedComponent); 
                });
            }

            this.addSeparator();
        }

        // --- SECCIÓN PELIGRO ---
        if (!this.selectedComponent && !(this.selectedNode instanceof LinearGuide)) {
            let row = createDiv(); row.parent(this.editor); row.style("margin-bottom", "4px");
            let btnPend = createButton("🪃 Añadir Péndulo", "#8e44ad");
            btnPend.parent(row);
            this.styleBtn(btnPend, "#8e44ad");
            btnPend.mousePressed(() => { this.system.createPendulum(this.selectedNode, 150, PI/4, 1); this.update(); });
            this.addSeparator();
        }

        // --- SECCIÓN PELIGRO FALSO (Aseguramos que no esté duplicado) ---
        // Nota: Este bloque ya se movió arriba en la versión definitiva, lo dejo comentado por seguridad
        /*
        if (!this.selectedComponent && !(this.selectedNode instanceof LinearGuide)) {
            let row = createDiv(); row.parent(this.editor); row.style("margin-bottom", "4px");
            this.addBtn(row, "🪃 Añadir Péndulo", "#8e44ad");
            row.mousePressed(() => { this.system.createPendulum(this.selectedNode, 150, PI/4, 1); this.update(); });
            this.addSeparator();
        }
        */

        // --- SECCIÓN PELIGRO (La correcta) ---
        if (!this.selectedComponent && !(this.selectedNode instanceof LinearGuide)) {
            let row = createDiv(); row.parent(this.editor); row.style("margin-bottom", "4px");
            let btnPend = createButton("🪃 Añadir Péndulo", "#8e44ad");
            btnPend.parent(row);
            this.styleBtn(btnPend, "#8e44ad");
            btnPend.mousePressed(() => { this.system.createPendulum(this.selectedNode, 150, PI/4, 1); this.update(); });
            this.addSeparator();
        }

        // --- SECCIÓN PELIGRO FALSO (Aseguramos que no esté duplicado) ---
        /*
        if (!this.selectedComponent && !(this.selectedNode instanceof LinearGuide)) {
            let row = createDiv(); row.parent(this.editor); row.style("margin-bottom", "4px");
            let btnPend = createButton("🪃 Añadir Péndulo", "#8e44ad");
            btnPend.parent(row);
            this.styleBtn(btnPend, "#8e44ad");
            btnPend.mousePressed(() => { this.system.createPendulum(this.selectedNode, 150, PI/4, 1); this.update(); });
            this.addSeparator();
        }
        */

        // --- SECCIÓN PELIGRO FALSO (Aseguramos que no esté duplicado) ---
        /*
        if (!this.selectedComponent && !(this.selectedNode instanceof LinearGuide)) {
            let row = create_div(); row.parent(this.editor); row.style("margin-bottom", "4px");
            let btnPend = createButton("🪃 Añadir Péndulo", "#8e44ad");
            btnPend.parent(row);
            this.styleBtn(btnPend, "#8e44 Babylon;  <-- OJO: Esto es un error de tipeo, debe ser #8e44ad
            btnPend.mousePressed(() => { this.system.createPendulum(this.selectedNode, 150, PI/4, 1); this.update(); });
            this.addSeparator();
        }
        */

        // --- SECCIÓN PELIGRO (La definitiva) ---
        if (!this.selectedComponent && !(this.selectedNode instanceof LinearGuide)) {
            let row = createDiv(); row.parent(this.editor); row.style("margin-bottom", "4px");
            let btnPend = createButton("🪃 Añadir Péndulo", "#8e44ad");
            btnPend.parent(row);
            this.styleBtn(btnPend, "#8e44ad");
            btnPend.mousePressed(() => { this.system.createPendulum(this.selectedNode, 150, PI/4, 1); this.update(); });
            this.addSeparator();
        }

// ==========================================
        // ANÁLIZADOR CINEMÁTICO (Topología real, sin depender de la Parte 2)
        // ==========================================
        if (this.selectedNode && !(this.selectedNode instanceof LinearGuide)) {
            let hasGear = this.selectedNode.components.find(c => c instanceof Gear);
            if (hasGear) {
                this.addSeparator();
                this.addSectionTitle("📊 Tren de Reducción");
                
                let chainDiv = createDiv();
                chainDiv.parent(this.editor);
                let kinData = this.system.getKinematicData(this.selectedNode);
                
                if (!kinData) {
                    let msg = createDiv("<i style='color:#888; font-size:10px;'>Componente sin engranajes conectados.</i>");
                    msg.parent(chainDiv);
                } else if (kinData.isMotor) {
                    let msg = createDiv("<b style='color:#e67e22; font-size:11px;'>⚡ Fuente de energía (Motor)</b>");
                    msg.parent(chainDiv);
                } else {
                    let energyPath = kinData.energyPath || [];
                    let htmlString = "";
                
                    if (energyPath.length === 0) {
                        htmlString = "<i style='color:#888; font-size:10px;'>Sin ruta cinemática.</i>";
                    } else {
                        for (let i = 0; i < energyPath.length - 1; i++) {
                            let current = energyPath[i];
                            let next = energyPath[i + 1];
                
                            let tag = current.node.isDriver ? "⚡" : "⚙️";
                            htmlString += `${tag} ${current.name}(${current.teeth}d) `;
                
                            if (current.node === next.node) {
                                htmlString += ` <span style="color:#8e44ad;">[eje] → ${next.name}(${next.teeth}d)</span> `;
                            } else {
                                let d1 = current.teeth;
                                let d2 = next.teeth;
                                let ratioStr = (d1 > 0 && d2 > 0) ? `x${(d1 / d2).toFixed(2)}` : "";
                                htmlString += ` <span style="color:#e74c3c;">[${ratioStr}]</span> → `;
                            }
                        }
                        let last = energyPath[energyPath.length - 1];
                        if (last && last.node) {
                            let tagLast = last.node.isDriver ? "⚡" : "⚙️";
                            htmlString += `${tagLast} ${last.name}(${last.teeth}d) `;
                        }
                    }
                    chainDiv.html(htmlString);
                
                    let resultDiv = createDiv();
                    resultDiv.parent(chainDiv);
                    resultDiv.style("font-size", "11px");
                    resultDiv.style("font-weight", "bold");
                    resultDiv.style("color", "#2980b9");
                
                    let r = kinData.totalRatio;
                    let displayRatio = (r >= 1) ? `x${r.toFixed(2)}` : `1/${Math.round(1 / r)}`;
                    resultDiv.html(`Reducción Total: ${displayRatio}`);
                }
            }
        }

        // ==========================================
        // UI GLOBAL
        // ==========================================
        this.drawPersistenceUI();
        this.drawAudioUI();
    }
  
  // ---> INICIO UI DE PERSISTENCIA REUTILIZABLE <---
  
  drawPersistenceUI() {
        this.addSeparator();
        this.addSectionTitle("💾 Guardar / Cargar Diseño");
        
        let persistRow = createDiv();
        persistRow.parent(this.editor);
        persistRow.style("display", "flex");
        persistRow.style("gap", "4px");

        let btnSave = createButton("💾 Exportar");
        btnSave.parent(persistRow); this.styleBtn(btnSave, "#16a085");
        btnSave.mousePressed(() => {
            let json = this.system.saveClockToJSON();
            let blob = new Blob([json], { type: "application/json" });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = 'mi_reloj.json';
            a.click();
            URL.revokeObjectURL(url);
        });

        let btnLoad = createButton("📂 Cargar");
        btnLoad.parent(persistRow); this.styleBtn(btnLoad, "#2980b9");
        btnLoad.mousePressed(() => {
            let input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                let file = e.target.files[0];
                if (file) {
                    let reader = new FileReader();
                    reader.onload = (event) => {
                        this.system.loadClockFromJSON(event.target.result);
                        this.setSelection(null); 
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        });
    }
    // ---> FIN UI DE PERSISTENCIA REUTILIZABLE <---  

    // ---> INICIO UI DE AUDIO REUTILIZABLE <---
    drawAudioUI() {
        this.addSeparator();
        this.addSectionTitle("🔊 Configuración de Audio");
        
        // Fila 1: Tipo de onda
        let audioRow1 = createDiv();
        audioRow1.parent(this.editor);
        audioRow1.style("display", "flex");
        audioRow1.style("gap", "4px");
        audioRow1.style("align-items", "center");
        audioRow1.style("margin-bottom", "4px");
        
        let lblTipo = createElement("span", "Onda:"); lblTipo.parent(audioRow1); lblTipo.style("font-size","9px"); lblTipo.style("width","30px");
        let selectOnda = createSelect();
        selectOnda.parent(audioRow1);
        selectOnda.option('sine'); selectOnda.option('triangle'); selectOnda.option('square'); selectOnda.option('sawtooth'); selectOnda.option('custom (Duty)');
        selectOnda.value(soundType); 
        selectOnda.style("flex", "1"); selectOnda.style("font-size", "10px"); selectOnda.style("padding", "2px");
        selectOnda.changed(() => { soundType = selectOnda.value(); });

        // Fila 2: Frecuencia y Caída
        let audioRow2 = createDiv();
        audioRow2.parent(this.editor);
        audioRow2.style("display", "flex");
        audioRow2.style("gap", "4px");
        audioRow2.style("align-items", "center");
        audioRow2.style("margin-bottom", "4px");
        
        let lblFreq = createElement("span", "Hz:"); lblFreq.parent(audioRow2); lblFreq.style("font-size","9px"); lblFreq.style("width","20px");
        let inputFreq = createInput(str(soundFreq), "number"); inputFreq.parent(audioRow2);
        inputFreq.attribute("step", "50"); inputFreq.style("width", "45px"); inputFreq.style("font-size", "10px"); inputFreq.style("padding", "3px");
        inputFreq.input(() => { let v = float(inputFreq.value()); if(!isNaN(v)) soundFreq = v; });
        
        let lblDecay = createElement("span", "Caida:"); lblDecay.parent(audioRow2); lblDecay.style("font-size","9px");
        let inputDecay = createInput(str(soundDecay), "number"); inputDecay.parent(audioRow2);
        inputDecay.attribute("step", "0.01"); inputDecay.style("width", "45px"); inputDecay.style("font-size", "10px"); inputDecay.style("padding", "3px");
        inputDecay.input(() => { let v = float(inputDecay.value()); if(!isNaN(v)) soundDecay = v; });

        // Fila 3: Volumen (Slider)
        let audioRow3 = createDiv();
        audioRow3.parent(this.editor);
        audioRow3.style("display", "flex");
        audioRow3.style("gap", "4px");
        audioRow3.style("align-items", "center");
        
        let lblVol = createElement("span", "Vol:"); lblVol.parent(audioRow3); lblVol.style("font-size","9px"); lblVol.style("width","25px");
        let sliderVol = createSlider(0, 100, soundVolume * 100, 1); sliderVol.parent(audioRow3);
        sliderVol.style("flex", "1"); 
        sliderVol.input(() => { soundVolume = sliderVol.value() / 100; });
    }
    // ---> FIN UI DE AUDIO REUTILIZABLE <---
  
    // --- UTILIDADES DE DISEÑO COMPACTO ---
    addSectionTitle(text) {
        let t = createDiv(`<b style="color:#555; font-size:10px; text-transform:uppercase;">${text}</b>`);
        t.parent(this.editor); t.style("margin-bottom", "3px");
    }

    addSeparator() {
        let hr = createDiv("<hr style='border:0; border-top:1px solid #eee; margin:4px 0;'>");
        hr.parent(this.editor);
    }

    addBtn(parentDiv, text, color, callback) {
        let b = createButton(text); b.parent(parentDiv); this.styleBtn(b, color);
        b.mousePressed(callback);
      return b;
    }

    styleBtn(btn, color = "#34495e") {
        btn.style("padding", "5px 6px");
        btn.style("background", color);
        btn.style("color", "white");
        btn.style("border", "none");
        btn.style("border-radius", "3px");
        btn.style("cursor", "pointer");
        btn.style("font-size", "10px");
        btn.style("flex-shrink", "0");
    }

    // --- UTILIDADES DE ESTADO DE CONEXIÓN ---
    clearActiveStyles(exceptThisBtn = null) {
        if (this.btnConnectGear && this.btnConnectGear !== exceptThisBtn) { this.resetButtonStyle(this.btnConnectGear); this.system.endConnection(); }
        if (this.btnConnectPulley && this.btnConnectPulley !== exceptThisBtn) { this.resetButtonStyle(this.btnConnectPulley); this.system.endPulleyConnection(); }
        if (this.btnConnectRack && this.btnConnectRack !== exceptThisBtn) { this.resetButtonStyle(this.btnConnectRack); this.system.endRackConnection(); }
        if (this.system.pendulumSelectionMode) { this.system.pendulumSelectionMode = false; this.system.pendingEscapeGear = null; }
    }

    setActiveStyle(btn) { btn.style("opacity", "0.6"); btn.style("border", "2px dashed white"); }
    resetButtonStyle(btn) { btn.style("opacity", "1"); btn.style("border", "none"); }
}