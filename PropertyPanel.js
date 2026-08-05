class PropertyPanel {
    constructor(system) {
        this.system = system;
        this.selectedNode = null;
        this.selectedComponent = null;
        this.coaxialOptions = [];
        this.audioPanelOpen = false;
        this.analysisPanelOpen = false;

        // Estados de plegado
        this.sections = {
            components: true,
            create: true,
            inspector: true,
            analysis: false,
            delete: false,
            name: true
        };

        // --- CONTENEDOR PRINCIPAL ---
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
        this.container.style("max-height", "600px");
        this.container.style("overflow-y", "auto");
        // Reserva el espacio de la barra de scroll aunque no esté visible, para que
        // el ancho útil del panel NUNCA cambie al aparecer/desaparecer contenido vertical
        // (ej. al abrir Análisis y Tren). Sin esto, la fila de botones del Inspector —
        // que ya usa casi todo el ancho disponible — pierde esos px justo cuando el
        // scroll aparece, y el último botón salta a una nueva línea.
        this.container.style("scrollbar-gutter", "stable");

        // --- CABECERA ---
        this.header = createDiv("🔧 TALLER DE RELOJERÍA");
        this.header.parent(this.container);
        this.header.style("background", "#2c3e50");        // ✅ Fondo azul oscuro
        this.header.style("color", "white");               // ✅ Letras blancas
        this.header.style("padding", "6px 10px");          // ✅ Espaciado interno
        this.header.style("border-radius", "4px 4px 0 0"); // ✅ Bordes redondeados solo arriba
        this.header.style("font-size", "13px");
        this.header.style("font-weight", "bold");
        this.header.style("text-align", "center");         // ✅ Centrar el texto
        this.header.style("margin-bottom", "6px");
        this.header.style("letter-spacing", "0.5px");      // ✅ Pequeño espaciado entre letras

        // --- INFO DEL EJE SELECCIONADO ---
        this.nodeInfo = createDiv("<i style='color:#888;'>Sin selección</i>");
        this.nodeInfo.parent(this.container);
        this.nodeInfo.style("margin-bottom", "6px");
        this.nodeInfo.style("font-size", "11px");
        this.nodeInfo.style("padding", "4px 6px");
        this.nodeInfo.style("background", "#f0f0f0");
        this.nodeInfo.style("border-radius", "4px");
        this.nodeInfo.style("border", "1px solid #bbb");

        // --- FILA DE COORDENADAS Y PLANOS ---
        this.coordRow = createDiv();
        this.coordRow.parent(this.container);
        this.coordRow.style("display", "flex");
        this.coordRow.style("flex-wrap", "nowrap");
        this.coordRow.style("gap", "3px");
        this.coordRow.style("align-items", "center");
        this.coordRow.style("margin-bottom", "6px");
        this.coordRow.style("padding", "3px 10px 3px 6px");
        this.coordRow.style("background", "#f8f9fa");
        this.coordRow.style("border-radius", "4px");
        this.coordRow.style("border", "1px solid #bbb");
        this.coordRow.style("width", "100%");
        this.coordRow.style("box-sizing", "border-box");   
        this.coordRow.hide();

        // X
        let lblX = createElement("span", "X:");
        lblX.parent(this.coordRow);
        lblX.style("font-size", "9px");
        lblX.style("flex-shrink", "0");
 //       lblX.style("margin-right", "1px");
        
        this.inputX = createInput("0", "number");
        this.inputX.parent(this.coordRow);
        this.inputX.attribute("step", "1");
        this.inputX.style("width", "35px"); 
        this.inputX.style("font-size", "9px");
        this.inputX.style("padding", "1px 2px");
        this.inputX.style("flex-shrink", "0");
        this.inputX.style("flex-grow", "0");
        
        // Y
        let lblY = createElement("span", "Y:");
        lblY.parent(this.coordRow);
        lblY.style("font-size", "9px");
        lblY.style("flex-shrink", "0");
 //       lblY.style("margin-left", "2px");
 //       lblY.style("margin-right", "1px");
        
        this.inputY = createInput("0", "number");
        this.inputY.parent(this.coordRow);
        this.inputY.attribute("step", "1");
        this.inputY.style("width", "35px");
        this.inputY.style("font-size", "10px");
        this.inputY.style("padding", "2px");
        this.inputY.style("flex-shrink", "0");
        this.inputY.style("flex-grow", "0");      
        
        // Bloqueo
        this.btnLock = createButton("🔓");
        this.btnLock.parent(this.coordRow);
        this.btnLock.style("width", "28px");
        this.btnLock.style("height", "20px");
        this.btnLock.style("padding", "2px");
        this.btnLock.style("font-size", "10px");
        this.btnLock.style("cursor", "pointer");
        this.btnLock.style("flex-shrink", "0");
        this.inputX.style("flex-grow", "0");
        this.btnLock.style("margin-left", "5px");
        this.btnLock.mousePressed(() => {
            if (!this.selectedNode || this.selectedNode instanceof LinearGuide) return;
            this.selectedNode.isLocked = !this.selectedNode.isLocked;
            this.updateNodeInfo();
        });
        
        // ✅ Selector de planos
        this.createPlaneSelector(this.coordRow);
        
        // Eventos de coordenadas
        this.inputX.input(() => this.handleCoordInput());
        this.inputY.input(() => this.handleCoordInput());

        // --- CONTENEDOR PRINCIPAL DEL EDITOR ---
        this.editor = createDiv();
        this.editor.parent(this.container);
        this.editor.style("margin-bottom", "6px");

        // --- BARRA INFERIOR FIJA ---
        this.bottomBar = createDiv();
        this.bottomBar.parent(this.container);
        this.bottomBar.style("border-top", "1px solid #bbb");
        this.bottomBar.style("padding-top", "4px");
        this.bottomBar.style("margin-top", "4px");

        let toolRow = createDiv();
        toolRow.parent(this.bottomBar);
        toolRow.style("display", "flex");
        toolRow.style("gap", "3px");
        toolRow.style("flex-wrap", "wrap");

        // Botones globales (íconos)
        let presBtn = createButton('🎬');
        presBtn.parent(toolRow);
        presBtn.attribute('title', 'Modo Presentación (tecla P)');
        this.styleBtn(presBtn, "#2c3e50");
        presBtn.style("padding", "3px 6px");
        presBtn.style("font-size", "10px");
        presBtn.mousePressed(() => {
            if (typeof togglePresentationMode === 'function') togglePresentationMode();
        });

        let saveBtn = createButton('💾');
        saveBtn.parent(toolRow);
        saveBtn.attribute('title', 'Guardar proyecto como JSON');
        this.styleBtn(saveBtn, "#16a085");
        saveBtn.style("padding", "3px 6px");
        saveBtn.style("font-size", "10px");
        saveBtn.mousePressed(() => {
            let name = prompt("Nombre del proyecto:", "Mi Reloj");
            if (name === null) return;
            let json = this.system.saveProject(name);
            let blob = new Blob([json], { type: "application/json" });
            let url = URL.createObjectURL(blob);
            let a = document.createElement('a');
            a.href = url;
            a.download = name.replace(/\s+/g, '_') + '.json';
            a.click();
            URL.revokeObjectURL(url);
        });

        let loadBtn = createButton('📂');
        loadBtn.parent(toolRow);
        loadBtn.attribute('title', 'Cargar proyecto desde JSON'); 
        this.styleBtn(loadBtn, "#2980b9");
        loadBtn.style("padding", "3px 6px");
        loadBtn.style("font-size", "10px");
        loadBtn.mousePressed(() => {
            let input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                let file = e.target.files[0];
                if (file) {
                    let reader = new FileReader();
                    reader.onload = (event) => {
                        try {
                            this.system.loadProject(event.target.result);
                            this.setSelection(null);
                            if (this.planeSelector) {
                                let currentVal = (activePlane === null) ? "null" : String(activePlane);
                                this.planeSelector.value(currentVal);
                            }
                            this.updateAudioUI();
                        } catch (err) {
                            console.error("Error al cargar:", err);
                            alert("Error al cargar el archivo: " + err.message);
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        });

        let audioBtn = createButton('🔊');
        audioBtn.parent(toolRow);
        audioBtn.attribute('title', 'Controles de audio (tic/toc)');
        this.styleBtn(audioBtn, "#7f8c8d");
        audioBtn.style("padding", "3px 6px");
        audioBtn.style("font-size", "10px");
        audioBtn.mousePressed(() => {
            this.audioPanelOpen = !this.audioPanelOpen;
            this.updateAudioUI();
        });
        this.audioToggleBtn = audioBtn;

        let analysisBtn = createButton('📊');
        analysisBtn.parent(toolRow);
        analysisBtn.attribute('title', 'Análisis del sistema'); 
        this.styleBtn(analysisBtn, "#8e44ad");
        analysisBtn.style("padding", "3px 6px");
        analysisBtn.style("font-size", "10px");
        analysisBtn.mousePressed(() => {
            this.analysisPanelOpen = !this.analysisPanelOpen;
            this.updateAnalysisUI();
        });
        this.analysisToggleBtn = analysisBtn;

        let compareBtn = createButton('🔁');
        compareBtn.parent(toolRow);
        compareBtn.attribute('title', 'Modo Comparativo (dos sistemas)');
        this.styleBtn(compareBtn, "#e67e22");
        compareBtn.style("padding", "3px 6px");
        compareBtn.style("font-size", "10px");
        compareBtn.mousePressed(() => {
            if (typeof toggleComparisonMode === 'function') toggleComparisonMode();
        });

        // Contenedores colapsables (audio y análisis) en la barra inferior
        this.audioContainer = createDiv();
        this.audioContainer.parent(this.bottomBar);
        this.audioContainer.style("margin-top", "2px");
        this.audioContainer.hide();

        this.analysisContainer = createDiv();
        this.analysisContainer.parent(this.bottomBar);
        this.analysisContainer.style("margin-top", "2px");
        this.analysisContainer.hide();

        // Inicializar
        this.update();
    }

    // ==========================================
    // MÉTODOS PRINCIPALES
    // ==========================================

    update() {
        this.updateNodeInfo();
        this.updateEditor();
        if (this.planeSelector) {
            let currentVal = (activePlane === null) ? "null" : String(activePlane);
            this.planeSelector.value(currentVal);
        }
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

    // ==========================================
    // INFO DEL NODO
    // ==========================================
/*
    updateNodeInfo() {
        if (!this.selectedNode) {
            this.nodeInfo.html("<i style='color:#888;'>Sin selección</i>");
            this.coordRow.hide();
            return;
        }
        let n = this.selectedNode;
        let tipo = (n instanceof LinearGuide) ? "📏 Guía" : `🔵 S${n.id}`;
        let vel = (n instanceof LinearGuide) ? `v: ${nf(n.linearVelocity, 1, 1)}` : `ω: ${nf(n.omega, 1, 1)} rad/s`;
        let motorTag = n.isDriver ? " <span style='color:#e67e22; font-weight:bold;'>⚡Motor</span>" : "";
//        this.nodeInfo.html(`${tipo} seleccionado ${motorTag} — ${vel}`);

        this.nodeInfo.html("");
      
        if (!(n instanceof LinearGuide)) {
            this.coordRow.show();
            this.coordRow.style("display", "flex"); // p5's show() resetea a display:block, hay que reforzar flex
            this.btnLock.html(this.selectedNode.isLocked ? "🔒" : "🔓");
            this.inputX.style("background", this.selectedNode.isLocked ? "#f0f0f0" : "white");
            this.inputY.style("background", this.selectedNode.isLocked ? "#f0f0f0" : "white");
            if (document.activeElement !== this.inputX.elt) this.inputX.value(Math.round(n.x));
            if (document.activeElement !== this.inputY.elt) this.inputY.value(Math.round(n.y));
        } else {
            this.coordRow.hide();
        }
    }  */
    updateNodeInfo() {
        if (!this.selectedNode) {
            this.nodeInfo.html("<i style='color:#888;'>Sin selección</i>");
            this.coordRow.hide();
            return;
        }
        let n = this.selectedNode;
        let tipo = (n instanceof LinearGuide) ? "📏 Guía" : `🔵 S${n.id}`;
        let vel = (n instanceof LinearGuide) ? `v: ${nf(n.linearVelocity, 1, 1)}` : `ω: ${nf(n.omega, 1, 1)} rad/s`;
        let motorTag = n.isDriver ? " <span style='color:#e67e22; font-weight:bold;'>⚡Motor</span>" : "";
        
        // ✅ Limpiar y reconstruir nodeInfo con campo editable
        this.nodeInfo.html("");
        
        // Contenedor para la información del eje
        let infoRow = createDiv();
        infoRow.parent(this.nodeInfo);
        infoRow.style("display", "flex");
        infoRow.style("align-items", "center");
        infoRow.style("gap", "4px");
        infoRow.style("flex-wrap", "wrap");
        
        // Etiqueta del tipo de nodo
        let typeLabel = createSpan(tipo);
        typeLabel.parent(infoRow);
        typeLabel.style("font-size", "11px");
        typeLabel.style("font-weight", "bold");
        
        // ✅ Campo de nombre editable (solo para ejes)
        if (!(n instanceof LinearGuide)) {
            let nameInput = createInput(n.name || `S${n.id}`);
            nameInput.parent(infoRow);
            nameInput.style("width", "60px");
            nameInput.style("font-size", "10px");
            nameInput.style("padding", "2px");
            nameInput.style("border", "1px solid #ccc");
            nameInput.style("border-radius", "3px");
            nameInput.value(n.name || `S${n.id}`);
            nameInput.input(() => {
                n.name = nameInput.value() || `S${n.id}`;
                // Actualizar la lista de componentes si es necesario
                this.updateComponentList();
            });
        }
        
        // Velocidad y motor
        let velLabel = createSpan(vel + motorTag);
        velLabel.parent(infoRow);
        velLabel.style("font-size", "11px");
        velLabel.style("color", "#333");
    
        // Coordenadas
        if (!(n instanceof LinearGuide)) {
            this.coordRow.show();
            this.coordRow.style("display", "flex");  // Reforzar flex
            this.btnLock.html(this.selectedNode.isLocked ? "🔒" : "🔓");
            this.inputX.style("background", this.selectedNode.isLocked ? "#f0f0f0" : "white");
            this.inputY.style("background", this.selectedNode.isLocked ? "#f0f0f0" : "white");
            if (document.activeElement !== this.inputX.elt) this.inputX.value(Math.round(n.x));
            if (document.activeElement !== this.inputY.elt) this.inputY.value(Math.round(n.y));
        } else {
            this.coordRow.hide();
        }
    }
  
    handleCoordInput() {
        if (!this.selectedNode || this.selectedNode instanceof LinearGuide) return;
        if (this.selectedNode.isLocked) {
            this.inputX.value(Math.round(this.selectedNode.x));
            this.inputY.value(Math.round(this.selectedNode.y));
            return;
        }
        let newX = parseFloat(this.inputX.value());
        let newY = parseFloat(this.inputY.value());
        if (isNaN(newX) && isNaN(newY)) return;
        let targetX = !isNaN(newX) ? Math.round(newX) : this.selectedNode.x;
        let targetY = !isNaN(newY) ? Math.round(newY) : this.selectedNode.y;
        if (targetX === this.selectedNode.x && targetY === this.selectedNode.y) return;
        this.system.draggedShaft = this.selectedNode;
        if (this.selectedNode.isDriver) {
            this.system.dragRigidly(targetX, targetY);
        } else {
            this.system.dragTo(targetX, targetY);
            for (let mesh of this.system.meshes) {
                let fixedShaft = null;
                if (mesh.driver.shaft === this.selectedNode) fixedShaft = mesh.driven.shaft;
                else if (mesh.driven.shaft === this.selectedNode) fixedShaft = mesh.driver.shaft;
                if (fixedShaft) this.system.restoreMesh(mesh, fixedShaft);
            }
        }
        this.system.draggedShaft = null;
        this.system.afterGeometryChange();
        this.updateNodeInfo();
    }

    // ==========================================
    // SELECTOR DE PLANOS
    // ==========================================

    createPlaneSelector(parent) {
        let wrapper = createDiv();
        wrapper.parent(parent);
        wrapper.style("display", "flex");
        wrapper.style("align-items", "center");
        wrapper.style("gap", "2px");
        wrapper.style("flex-shrink", "0");
        wrapper.style("flex-grow", "0");
        wrapper.style("width", "auto");
        wrapper.style("margin-left", "auto"); 

        let label = createElement("span", "P:");
        label.parent(wrapper);
        label.style("font-size", "8px");              // ✅ Más pequeño
        label.style("margin-right", "1px");
    
        let planeSelector = createSelect();
        planeSelector.parent(wrapper);
        planeSelector.attribute('title', 'Filtrar por plano de profundidad');
        planeSelector.option("Todos", "null");
        planeSelector.option("Plano 0", "0");
        planeSelector.option("Plano 1", "1");
        planeSelector.option("Plano 2", "2");
        planeSelector.style("width", "60px");         // ✅ Reducido a 38px
        planeSelector.style("font-size", "9px");      // ✅ Más pequeño
        planeSelector.style("padding", "2px");
        planeSelector.style("margin", "0");
        planeSelector.style("flex-shrink", "0");
        planeSelector.style("height", "20px");
        planeSelector.style("line-height", "20px");
        planeSelector.style("vertical-align", "middle");
    
        let currentVal = (activePlane === null) ? "null" : String(activePlane);
        planeSelector.value(currentVal);
    
        planeSelector.changed(() => {
            let val = planeSelector.value();
            if (val === "null") {
                xrayMode = false;
                activePlane = null;
            } else {
                xrayMode = true;
                activePlane = parseInt(val);
            }
            if (window.renderer) {
                renderer.invalidateCache();
                renderer.cacheDirty = true;
            }
        });
        this.planeSelector = planeSelector;
    }

    // ==========================================
    // EDITOR PRINCIPAL
    // ==========================================

    updateEditor() {
        this.editor.html("");

        if (this.coaxialOptions.length > 0) {
            this.drawCoaxialUI();
            return;
        }

        if (!this.selectedNode) {
            if (this.system.shafts.length === 0 && this.system.guides.length === 0) {
                let btn = createButton("➕ Crear Primer Eje");
                btn.parent(this.editor);
                this.styleBtn(btn, "#3498db");
                btn.style("width", "100%");
                btn.mousePressed(() => {
                    let shaft = this.system.createShaft(width / 2, height / 2);
                    this.setSelection(shaft);
                });
                return;
            } else {
                let msg = createDiv("<i style='color:#888; font-size:10px;'>Haz clic en un eje o guía para ver sus propiedades.</i>");
                msg.parent(this.editor);
                msg.style("padding", "4px 0");
                let btn = createButton("➕ Nuevo Eje");
                btn.parent(this.editor);
                this.styleBtn(btn, "#95a5a6");
                btn.style("width", "100%");
                btn.mousePressed(() => {
                    let shaft = this.system.createShaft(width / 2, height / 2);
                    this.setSelection(shaft);
                });
                return;
            }
        }

        // --- SECCIÓN: COMPONENTES ---
        this.createCollapsibleSection(
            this.editor,
            "📦 COMPONENTES EN ESTE EJE",
            "components",
            (container) => {
                this.buildComponentList(container);
            }
        );

        // --- SECCIÓN: CREAR ---
        this.createCollapsibleSection(
            this.editor,
            "➕ CREAR Y AÑADIR",
            "create",
            (container) => {
                this.buildCreateSection(container);
            }
        );

        // --- SECCIÓN: INSPECTOR ---
        if (this.selectedComponent) {
            this.createCollapsibleSection(
                this.editor,
                `⚙️ INSPECTOR: ${this.getComponentLabel(this.selectedComponent)}`,
                "inspector",
                (container) => {this.buildInspectorSection(container)}
            );
        }

        // --- SECCIÓN: ANÁLISIS ---
        this.createCollapsibleSection(
            this.editor,
            "📊 ANÁLISIS Y TREN",
            "analysis",
            (container) => {
                this.buildAnalysisSection(container);
            }
        );

        // --- SECCIÓN: ELIMINAR ---
        this.createCollapsibleSection(
            this.editor,
            "🗑️ ELIMINAR",
            "delete",
            (container) => {
                this.buildDeleteSection(container);
            }
        );
    }

    // ==========================================
    // SECCIONES PLEGABLES
    // ==========================================

    createCollapsibleSection(container, title, stateKey, contentCallback) {
        let section = createDiv();
        section.parent(container);
        section.style("margin-bottom", "4px");
        section.style("border", "1px solid #bbb");
        section.style("border-radius", "4px");
        section.style("background", "#fafafa");
        section.style("overflow", "hidden");

        let header = createDiv();
        header.parent(section);
        header.style("display", "flex");
        header.style("align-items", "center");
        header.style("padding", "4px 8px");
        header.style("cursor", "pointer");
        header.style("background", "#e8e8e8");
        header.style("user-select", "none");
        header.mousePressed(() => {
            this.sections[stateKey] = !this.sections[stateKey];
            this.updateEditor();
        });

        let toggleIcon = createSpan(this.sections[stateKey] ? "▼" : "▶");
        toggleIcon.parent(header);
        toggleIcon.style("font-size", "10px");
        toggleIcon.style("margin-right", "6px");
        toggleIcon.style("color", "#666");

        let titleEl = createSpan(title);
        titleEl.parent(header);
        titleEl.style("font-size", "10px");
        titleEl.style("font-weight", "bold");
        titleEl.style("color", "#333");

        let contentWrapper = createDiv();
        contentWrapper.parent(section);
        contentWrapper.style("padding", "6px 8px");
        contentWrapper.style("background", "#ffffff");
        contentWrapper.style("border-radius", "0 0 4px 4px");
        contentWrapper.style("border", "1px solid #ccc");
        contentWrapper.style("border-top", "none");
        contentWrapper.style("margin", "0 1px 1px 1px");
        contentWrapper.style("box-sizing", "border-box");
      
        // ✅ AÑADIR: Forzar que el contentWrapper sea flex
        contentWrapper.style("display", "flex");
        contentWrapper.style("flex-direction", "column");
        contentWrapper.style("gap", "4px");
        contentWrapper.style("width", "100%");

        if (!this.sections[stateKey]) {
            contentWrapper.hide();
        }

        contentCallback(contentWrapper);
        return { section, header, content: contentWrapper, toggleIcon };
    }

    // ==========================================
    // CONSTRUCCIÓN DE SECCIONES
    // ==========================================

    getComponentLabel(comp) {
        let prefix = "";
        if (comp instanceof Gear) prefix = "G";
        else if (comp instanceof Pulley) prefix = "P";
        else if (comp instanceof Rack) prefix = "R";
        else if (comp instanceof Hand) prefix = "H";
        else if (comp instanceof Annulus) prefix = "A";
        else prefix = "?";

        let id = (comp.id !== undefined && comp.id !== null) ? comp.id : "?"; //Asegura que comp.id existe
        return `${prefix}${id}`;
    }

    buildComponentList(container) {
        if (!this.selectedNode || this.selectedNode.components.length === 0) {
            let msg = createDiv("<i style='color:#888; font-size:10px;'>No hay componentes en este eje.</i>");
            msg.parent(container);
            return;
        }
        let row = createDiv();
        row.parent(container);
        row.style("display", "flex");
        row.style("gap", "4px");
        row.style("flex-wrap", "wrap");
        for (let comp of this.selectedNode.components) {
            let label = this.getComponentLabel(comp);
            let isSelected = (comp === this.selectedComponent);
            let bgColor = isSelected ? "#aed6f1" : "#e8e8e8";
            let btn = createDiv(label);
            btn.parent(row);
            btn.style("background", bgColor);
            btn.style("padding", "2px 6px");
            btn.style("border-radius", "3px");
            btn.style("cursor", "pointer");
            btn.style("font-size", "10px");
            btn.style("border", isSelected ? "1px solid #2980b9" : "1px solid transparent");
            btn.mousePressed(() => {
                this.selectComponent(comp);
            });
        }
    }

    buildCreateSection(container) {
        // --- FILA 1: Combo + Añadir + Eje ---
        let row1 = createDiv();
        row1.parent(container);
        row1.style("display", "flex");
        row1.style("gap", "4px");
        row1.style("flex-wrap", "wrap");
        row1.style("margin-bottom", "4px");
    
        if (this.selectedNode instanceof LinearGuide) {
            let b = createButton("📏 Cremallera");
            b.parent(row1);
            this.styleBtn(b, "#f39c12");
            b.mousePressed(() => {
                let r = this.system.createRack(10, 5);
                this.system.mountRack(r, this.selectedNode);
                this.selectedComponent = r;
                this.update();
            });
            return;
        }
    
        let selectType = createSelect();
        selectType.parent(row1);
        selectType.option("⚙️ Engranaje");
        selectType.option("⭕ Polea");
        selectType.option("📏 Cre.+Guía");
        selectType.option("🖊️ Segundero");
        selectType.option("🖊️ Minutero");
        selectType.option("🖊️ Horario");
        selectType.style("font-size", "10px");
        selectType.style("flex", "1");
        selectType.style("padding", "2px");
        selectType.style("min-width", "60px");
    
        let bAdd = createButton("➕ Añadir");
        bAdd.parent(row1);
        this.styleBtn(bAdd, "#3498db");
        bAdd.mousePressed(() => {
            this.system.pushHistory();
            let t = selectType.value();
            if (t.includes("Engranaje")) {
                let g = this.system.addGearToShaft(this.selectedNode);
                this.selectedComponent = g;
            } else if (t.includes("Polea")) {
                let p = this.system.createPulley("", 30);
                this.system.mountPulley(p, this.selectedNode);
                this.selectedComponent = p;
            } else if (t.includes("Cre")) {
                // 1. Verificar que hay un eje seleccionado
                if (!this.selectedNode) {
                    console.warn("⚠️ No hay eje seleccionado.");
                    return;
                }
                
                // 2. Buscar el piñón en el eje seleccionado
                let pinion = this.selectedNode.components.find(c => c instanceof Gear);
                
                if (!pinion) {
                    console.warn("⚠️ El eje seleccionado no tiene engranaje.");
                    // Crear la cremallera igual pero sin conectar
                    let g = this.system.createGuide(this.selectedNode.x, this.selectedNode.y + 80);
                    let r = this.system.createRack(10, 5);
                    this.system.mountRack(r, g);
                    this.selectedComponent = r;
                    this.update();
                    return;
                }
                
                // 3. Crear guía y cremallera
                let g = this.system.createGuide(pinion.x, pinion.y + pinion.outsideRadius + 30);
                let r = this.system.createRack(10, pinion.module, "Cremallera", pinion.plane);
                this.system.mountRack(r, g);
                
                // 4. Conectar automáticamente el piñón con la cremallera
                let mesh = this.system.createRackPinionMesh(pinion, r);
                this.system.restoreRackPinion(mesh, pinion.node);
                
                // 5. Seleccionar la cremallera
                this.selectedComponent = r;
                
                // 6. Actualizar UI
                this.update();
                
                console.log("✅ Cremallera creada y conectada al piñón.");
            
            } else if (t.includes("Segundero")) {
                let hand = this.system.createHand('segundero');
                this.system.mountHand(hand, this.selectedNode);
            } else if (t.includes("Minutero")) {
                let hand = this.system.createHand('minutero');
                this.system.mountHand(hand, this.selectedNode);
            } else if (t.includes("Horario")) {
                let hand = this.system.createHand('horario');
                this.system.mountHand(hand, this.selectedNode);
            }
            this.update();
        });
    
        let bShaft = createButton("🔵 Eje");
        bShaft.parent(row1);
        this.styleBtn(bShaft, "#95a5a6");
        bShaft.mousePressed(() => {
            this.system.pushHistory();
            let newShaft = this.system.createShaftAt(this.selectedNode.x + 80, this.selectedNode.y);
            this.setSelection(newShaft);
        });
    
        // --- FILA 2: Rama + Péndulo + Forklift + Corona ---
        let row2 = createDiv();
        row2.parent(container);
        row2.style("display", "grid");
        row2.style("grid-template-columns", "1fr 1fr");
        row2.style("gap", "6px");
        row2.style("align-items", "center");
        row2.style("margin-bottom", "4px");
    
        // ✅ Botón Rama (izquierda)
        let bBranch = createButton("🌿 Rama");
        bBranch.parent(row2);
        this.styleBtn(bBranch, "#8e44ad");
        bBranch.attribute("title", "Añadir rama al motor");
        bBranch.mousePressed(() => {
            this.system.pushHistory();
            let g = this.system.addBranchFromMotor(30);
            if (g) this.setSelection(g.shaft);
            this.update();
        });

        // 🪃 Péndulo (NUEVO)
        let bPendulum = createButton("🪃 Péndulo");
        bPendulum.parent(row2);
        this.styleBtn(bPendulum, "#8e44ad");
        bPendulum.attribute("title", "Añadir péndulo al eje seleccionado");
        bPendulum.mousePressed(() => {
            this.system.pushHistory();
            this.system.createPendulum(this.selectedNode, 150, PI/4, 1);
            this.update();
        });
    
/*        // ✅ Spacer para empujar Forklift al centro
        let spacerLeft = createDiv();
        spacerLeft.parent(row2);
        spacerLeft.style("flex", "1");
        spacerLeft.style("min-width", "4px");*/
    
        // ✅ Botón Forklift (centro)
        let bForklift = createButton("🔄 Forklift");
        bForklift.parent(row2);
        this.styleBtn(bForklift, "#2ecc71");
        bForklift.attribute("title", "Duplicar el mecanismo completo");
        bForklift.mousePressed(() => {
            this.system.pushHistory();
            this.system.forkliftSubgraph(this.selectedNode, 200, 100);
            this.update();
        });
    
        // ✅ ELIMINADO: el botón "Corona" que estaba aquí quedó redundante tras
        // la consolidación — hace exactamente lo mismo que el del panel
        // Inspector (junto a "Órbita"), pero ese aparece solo cuando hay un
        // eje seleccionado (contexto correcto); este era visible sin
        // selección, donde no podía hacer nada útil. Se deja solo el del
        // Inspector. La lógica sigue viva en
        // this.system.createOrConnectCorona(), sin cambios.
    }                             

//******************
    buildInspectorSection(container) {
        let comp = this.selectedComponent;
        if (!comp) return;
    
        // ==========================================
        // FILA 1: NOMBRE Y PROPIEDADES
        // ==========================================
        let propsRow = createDiv();
        propsRow.parent(container);
        propsRow.style("display", "flex");
        propsRow.style("flex-wrap", "nowrap");
        propsRow.style("gap", "4px");
        propsRow.style("align-items", "center");
        propsRow.style("width", "100%");
        propsRow.style("margin-bottom", "4px");
    
        let lblNom = createElement("span", "Nom:");
        lblNom.parent(propsRow);
        lblNom.style("font-size", "9px");
        lblNom.style("flex-shrink", "0");
        lblNom.attribute("title", "Nombre del componente");
    
        let nameIn = createInput(comp.name || "");
        nameIn.parent(propsRow);
        nameIn.style("flex", "1");
        nameIn.style("min-width", "27px");
        nameIn.style("font-size", "10px");
        nameIn.style("padding", "2px");
        nameIn.input(() => {
            comp.name = nameIn.value();
        });
    
        if (comp instanceof Gear) {
            let lblD = createElement("span", "D:");
            lblD.parent(propsRow);
            lblD.style("font-size", "9px");
            lblD.style("flex-shrink", "0");
            lblD.style("margin-left", "4px");
            lblD.attribute("title", "Número de dientes");
    
            let dIn = createInput(str(comp.teeth), "number");
            dIn.parent(propsRow);
            dIn.attribute("step", "1");
            dIn.style("width", "32px");
            dIn.style("font-size", "10px");
            dIn.style("padding", "1px 2px");
            dIn.style("flex-shrink", "0");
            dIn.input(() => {
                if (float(dIn.value()) >= 4) {
                    this.system.updateGearTeeth(comp, float(dIn.value()));
                }
            });
    
            let lblM = createElement("span", "M:");
            lblM.parent(propsRow);
            lblM.style("font-size", "9px");
            lblM.style("flex-shrink", "0");
            lblM.style("margin-left", "4px");
            lblM.attribute("title", "Módulo del engranaje");
    
            let mIn = createInput(str(comp.module), "number");
            mIn.parent(propsRow);
            mIn.attribute("step", "0.5");
            mIn.style("width", "28px");
            mIn.style("font-size", "10px");
            mIn.style("padding", "1px 2px");
            mIn.style("flex-shrink", "0");
            mIn.input(() => {
                if (float(mIn.value()) > 0) {
                    this.system.updateGearModule(comp, float(mIn.value()));
                }
            });
    
            let lblP = createElement("span", "P:");
            lblP.parent(propsRow);
            lblP.style("font-size", "9px");
            lblP.style("flex-shrink", "0");
            lblP.style("margin-left", "4px");
            lblP.attribute("title", "Plano de profundidad");
    
            let pIn = createInput(str(comp.plane || 0), "number");
            pIn.parent(propsRow);
            pIn.attribute("step", "1");
            pIn.style("width", "24px");
            pIn.style("font-size", "10px");
            pIn.style("padding", "1px 2px");
            pIn.style("flex-shrink", "0");
            pIn.input(() => {
                let v = int(pIn.value());
                if (!isNaN(v)) comp.plane = v;
            });
        } else if (comp instanceof Pulley) {
            let lblR = createElement("span", "R:");
            lblR.parent(propsRow);
            lblR.style("font-size", "9px");
            lblR.style("flex-shrink", "0");
            lblR.style("margin-left", "4px");
            lblR.attribute("title", "Radio de la polea");
    
            let rIn = createInput(str(comp.radius), "number");
            rIn.parent(propsRow);
            rIn.attribute("step", "1");
            rIn.style("width", "35px");
            rIn.style("font-size", "10px");
            rIn.style("padding", "1px 2px");
            rIn.style("flex-shrink", "0");
            rIn.input(() => {
                if (float(rIn.value()) > 0) {
                    this.system.updatePulleyRadius(comp, float(rIn.value()));
                }
            });
        }
    
        // ==========================================
        // FILA 2: ACCIONES (Engranar, Cremallera, Escape)
        // ==========================================
        let actionRow = createDiv();
        actionRow.parent(container);
        actionRow.style("display", "grid");
        actionRow.style("grid-template-columns", "1fr 1fr");
        actionRow.style("gap", "6px");
        actionRow.style("margin-bottom", "4px");
    
        if (comp instanceof Gear) {
            let btnEng = createButton("🔗 Engranar ");
            btnEng.parent(actionRow);
            this.styleBtn(btnEng, "#8e44ad");
            btnEng.attribute("title", "Conectar este engranaje con otro");
            if (this.system.connectionMode && this.system.connectionSourceGear === comp) {
                this.setWaitingStyle(btnEng);
            }
            btnEng.mousePressed(() => {
                this.clearActiveStyles();
                this.system.beginConnection(comp);
                this.setWaitingStyle(btnEng);
            });
    
            let btnCre = createButton("🔗 Cremallera");
            btnCre.parent(actionRow);
            this.styleBtn(btnCre, "#8e44ad");
            btnCre.attribute("title", "Conectar a una cremallera");
            if (this.system.rackConnectionMode && this.system.connectionSourcePinion === comp) {
                this.setWaitingStyle(btnCre);
            }
            btnCre.mousePressed(() => {
                this.clearActiveStyles();
                this.system.beginRackConnection(comp);
                this.setWaitingStyle(btnCre);
            });
    
            let isEsc = this.system.escapements.some(e => e.escapeGear === comp);
            if (!isEsc) {
                let escTypeSelect = createSelect();
                escTypeSelect.parent(actionRow);
                escTypeSelect.option("Suizo", "swiss");
                escTypeSelect.option("Cilindro", "cylinder");
                escTypeSelect.option("Cronómetro", "detent");
                escTypeSelect.option("Verge", "verge");
                escTypeSelect.style("font-size", "9px");
                escTypeSelect.style("padding", "2px");
                escTypeSelect.style("width", "65px");
                escTypeSelect.attribute("title", "Tipo de escape");
    
                let btnEscape = createButton("⏱️ Escape");
                btnEscape.parent(actionRow);
                this.styleBtn(btnEscape, "#c0392b");
                btnEscape.attribute("title", "Crear escape con este engranaje");
                if (this.system.pendulumSelectionMode && this.system.pendingEscapeGear === comp) {
                    this.setWaitingStyle(btnEscape);
                }
                btnEscape.mousePressed(() => {
                    this.system.pushHistory();
                    let type = escTypeSelect.value();
                    if (this.system.pendulums.length === 0) {
                        console.warn("Sin péndulos.");
                        return;
                    }
                    if (this.system.pendulums.length === 1) {
                        this.system.createEscapement(
                            this.system.pendulums[0].shaft,
                            comp,
                            type
                        );
                        this.update();
                    } else {
                        this.system.pendulumSelectionMode = true;
                        this.system.pendingEscapeGear = comp;
                        this.system.pendingEscapeType = type;
                        this.setWaitingStyle(btnEscape);
                        this.update();
                    }
                });
            }
        } else if (comp instanceof Pulley) {
            let btnPulley = createButton("🔗 Polea");
            btnPulley.parent(actionRow);
            this.styleBtn(btnPulley, "#8e44ad");
            btnPulley.attribute("title", "Conectar esta polea con otra");
            if (this.system.pulleyConnectionMode && this.system.connectionSourcePulley === comp) {
                this.setWaitingStyle(btnPulley);
            }
            btnPulley.mousePressed(() => {
                this.clearActiveStyles();
                this.system.beginPulleyConnection(comp);
                this.setWaitingStyle(btnPulley);
            });
        }
    
        // ==========================================
        // FILA 3: DESENGRANAR + MOTOR + ÓRBITA (UNA SOLA LÍNEA)
        // ==========================================
        let bottomRow = createDiv();
        bottomRow.parent(container);
        // ✅ CORREGIDO: antes "display:flex + flex-wrap:wrap" con botones
        // "flex:1 1 auto" — un botón solo en su línea se estiraba a ocupar
        // todo el ancho. Mismo esquema que ya usa row2 más arriba (grid 1fr
        // 1fr), que sí garantiza 2 por línea sin importar cuántos botones
        // haya en un momento dado.
        bottomRow.style("display", "grid");
        bottomRow.style("grid-template-columns", "1fr 1fr");
        bottomRow.style("gap", "4px");
        bottomRow.style("align-items", "center");
    
        // --- Desengranar ---
        if (comp instanceof Gear || comp instanceof Pulley) {
            let btnDisconnect = createButton("✂️ Desengranar");
            btnDisconnect.parent(bottomRow);
            // Gris = estructura/acción neutra (mismo significado que "crear eje").
            this.styleBtn(btnDisconnect, "#7f8c8d");
            btnDisconnect.attribute("title", "Desconectar este componente de sus enlaces");
            btnDisconnect.mousePressed(() => {
                if (comp) {
                    this.system.pushHistory();
                    this.system.disconnectComponent(comp);
                    this.update();
                }
            });
        }
    
        // --- Control de Motor (del eje seleccionado) ---
        if (this.selectedNode && !(this.selectedNode instanceof LinearGuide)) {
            let motorContainer = createDiv();
            motorContainer.parent(bottomRow);
            motorContainer.style("display", "flex");
            motorContainer.style("align-items", "center");
            motorContainer.style("gap", "3px");
            motorContainer.style("grid-column", "1 / -1"); // ocupa la línea completa (control compuesto)
            motorContainer.style("margin-top", "2px");
    
            let lblMotor = createElement("span", "⚡");
            lblMotor.parent(motorContainer);
            lblMotor.style("font-size", "10px");
            lblMotor.style("color", "#666");
            lblMotor.style("white-space", "nowrap");
            lblMotor.attribute("title", "Control del motor");
    
            let velInput = createInput(str(this.selectedNode.omega || 0), "number");
            velInput.parent(motorContainer);
            velInput.attribute("step", "0.1");
            velInput.style("width", "30px");
            velInput.style("font-size", "10px");
            velInput.style("padding", "2px");
            velInput.attribute("title", "Velocidad angular (rad/s)");
            velInput.input(() => {
                let val = float(velInput.value());
                if (!isNaN(val)) {
                    this.selectedNode.omega = val;
                    this.selectedNode.isDriver = (val !== 0);
                    if (this.btnMotor) {
                        this.btnMotor.html(this.selectedNode.isDriver ? "⚡ ON" : "⚡ OFF");
                        this.styleBtn(this.btnMotor, this.selectedNode.isDriver ? "#e67e22" : "#bdc3c7");
                    }
                    this.updateNodeInfo();
                }
            });
    
            this.btnMotor = createButton(this.selectedNode.isDriver ? "⚡ ON" : "⚡ OFF");
            this.btnMotor.parent(motorContainer);
            this.styleBtn(this.btnMotor, this.selectedNode.isDriver ? "#e67e22" : "#bdc3c7");
            this.btnMotor.style("width", "45px");
            this.btnMotor.style("font-size", "9px");
            this.btnMotor.style("padding", "4px");
            this.btnMotor.attribute("title", "Activar/Desactivar motor");
            this.btnMotor.mousePressed(() => {
                this.selectedNode.isDriver = !this.selectedNode.isDriver;
                if (!this.selectedNode.isDriver) {
                    this.selectedNode.omega = 0;
                } else {
                    if (this.selectedNode.omega === 0) {
                        this.selectedNode.omega = 2;
                    }
                }
                velInput.value(this.selectedNode.omega);
                for (let s of this.system.shafts) s.visited = false;
                this.btnMotor.html(this.selectedNode.isDriver ? "⚡ ON" : "⚡ OFF");
                this.styleBtn(this.btnMotor, this.selectedNode.isDriver ? "#e67e22" : "#bdc3c7");
                this.updateNodeInfo();
            });
    
            let labelRad = createElement("span", "rad/s");
            labelRad.parent(motorContainer);
            labelRad.style("font-size", "9px");
            labelRad.style("color", "#666");
            labelRad.attribute("title", "Unidad de velocidad angular");
    
            // --- Botón Órbita: crear el carrier ---
            // Este botón solo crea el carrier; si ya existe uno para este eje,
            // no hace nada más (no es un toggle).
            let existingCarrier = this.system.carriers.find(c => c.attachedShafts.includes(this.selectedNode));

            let bOrbit = createButton(existingCarrier ? "🌀 Órbita creada" : "🌀 Crear Órbita");
            bOrbit.parent(bottomRow);
            // ✅ Morado = "crear/conectar un mecanismo" (mismo significado que
            // engranar, crear polea, crear péndulo). Gris = ya creado / inactivo.
            this.styleBtn(bOrbit, existingCarrier ? "#95a5a6" : "#8e44ad");
            bOrbit.attribute("title", existingCarrier
                ? "Este eje ya tiene un carrier — usa el selector de modo para configurarlo"
                : "Crear movimiento orbital (tren planetario)");
            if (existingCarrier) {
                bOrbit.attribute("disabled", true);
            } else {
                bOrbit.mousePressed(() => {
                    let center = this.system.findCenterShaftFor(this.selectedNode);
                    if (center) {
                        this.system.pushHistory();
                        this.system.createCarrier(center, this.selectedNode);
                        this.update();
                    } else {
                        console.warn("No está engranado.");
                    }
                });
            }

            // ✅ Botón Corona — mismo método idempotente que el del panel CREAR.
            let btnCorona = createButton("⭕ Corona");
            btnCorona.parent(bottomRow);
            // Morado, mismo significado que "Crear Órbita": crear/conectar un mecanismo.
            this.styleBtn(btnCorona, "#8e44ad");
            btnCorona.attribute("title", "Crear o conectar la corona dentada (tren planetario)");
            btnCorona.mousePressed(() => {
                this.system.pushHistory();
                let annulus = this.system.createOrConnectCorona(this.selectedNode);
                if (annulus) {
                    console.log(`✅ Corona: ${annulus.teeth}d en (${annulus.shaft.x}, ${annulus.shaft.y})`);
                }
                this.update();
            });

            // --- Selector de modo: qué elemento es la entrada libre ---
            // ✅ NUEVO: 'Motor' y 'Corona' no necesitan lógica adicional — se
            // logran seleccionando el eje del sol o el de la corona y usando
            // SU propio botón de motor (arriba), porque la ecuación de Willis
            // es simétrica en omega_sol/omega_corona. Solo 'Traslación' es
            // realmente nuevo: el portador pasa a ser la entrada libre.
            if (existingCarrier) {
                let modeRow = createDiv();
                modeRow.parent(bottomRow);
                modeRow.style("grid-column", "1 / -1");
                modeRow.style("display", "flex");
                modeRow.style("gap", "4px");
                modeRow.style("margin-top", "2px");

                let lblMode = createElement("span", "Entrada libre:");
                lblMode.parent(modeRow);
                lblMode.style("font-size", "9px");
                lblMode.style("color", "#666");
                lblMode.style("white-space", "nowrap");

                const modes = [
                    { key: "motor", label: "⚡ Motor", hint: "El sol es la entrada — usa el botón de motor del eje del sol." },
                    { key: "corona", label: "⭕ Corona", hint: "La corona es la entrada — selecciona su eje y usa su propio botón de motor." },
                    { key: "traslacion", label: "🔄 Traslación", hint: "El portador es la entrada — velocidad editable abajo." },
                ];

                for (let m of modes) {
                    let isActive = (existingCarrier.inputMode || "motor") === m.key;
                    let bMode = createButton(m.label);
                    bMode.parent(modeRow);
                    bMode.style("flex", "1");
                    bMode.style("font-size", "8px");
                    bMode.style("padding", "3px 2px");
                    // Morado = modo activo (es la variante de "mecanismo configurado"
                    // en uso), gris = disponible pero no seleccionado.
                    this.styleBtn(bMode, isActive ? "#8e44ad" : "#bdc3c7");
                    bMode.attribute("title", m.hint);
                    bMode.mousePressed(() => {
                        existingCarrier.inputMode = m.key;
                        this.update();
                    });
                }

                // --- Control de velocidad del portador (solo modo Traslación) ---
                if ((existingCarrier.inputMode || "motor") === "traslacion") {
                    let hasAnnulus = existingCarrier.attachedShafts.some(s => this.system.findAnnulusFor(s));

                    let translContainer = createDiv();
                    translContainer.parent(bottomRow);
                    translContainer.style("grid-column", "1 / -1");
                    translContainer.style("display", "flex");
                    translContainer.style("align-items", "center");
                    translContainer.style("gap", "3px");

                    let lblTransl = createElement("span", "🔄");
                    lblTransl.parent(translContainer);
                    lblTransl.style("font-size", "10px");

                    let translInput = createInput(str(existingCarrier.omega || 0), "number");
                    translInput.parent(translContainer);
                    translInput.attribute("step", "0.1");
                    translInput.style("width", "30px");
                    translInput.style("font-size", "10px");
                    translInput.style("padding", "2px");
                    translInput.attribute("title", "Velocidad angular del portador (rad/s)");
                    translInput.input(() => {
                        let val = float(translInput.value());
                        if (!isNaN(val)) {
                            existingCarrier.omega = val;
                            existingCarrier.isDriver = (val !== 0);
                            this.updateNodeInfo();
                        }
                    });

                    let bTranslToggle = createButton(existingCarrier.isDriver ? "🔄 ON" : "🔄 OFF");
                    bTranslToggle.parent(translContainer);
                    this.styleBtn(bTranslToggle, existingCarrier.isDriver ? "#e67e22" : "#bdc3c7");
                    bTranslToggle.style("width", "45px");
                    bTranslToggle.style("font-size", "9px");
                    bTranslToggle.style("padding", "4px");
                    bTranslToggle.mousePressed(() => {
                        existingCarrier.isDriver = !existingCarrier.isDriver;
                        if (!existingCarrier.isDriver) {
                            existingCarrier.omega = 0;
                        } else if (existingCarrier.omega === 0) {
                            existingCarrier.omega = 1;
                        }
                        translInput.value(existingCarrier.omega);
                        this.update();
                    });

                    let labelRad2 = createElement("span", "rad/s");
                    labelRad2.parent(translContainer);
                    labelRad2.style("font-size", "9px");
                    labelRad2.style("color", "#666");

                    if (!hasAnnulus) {
                        let lblNote = createElement("span", "(sin corona: solo orbita el planeta)");
                        lblNote.parent(translContainer);
                        lblNote.style("font-size", "8px");
                        lblNote.style("color", "#999");
                    }
                } else {
                    // ✅ Opción A: en modos 'motor'/'corona', sin corona conectada
                    // la ecuación se cancela a 0 siempre — avisar en vez de
                    // fallar en silencio.
                    let hasAnnulus = existingCarrier.attachedShafts.some(s => this.system.findAnnulusFor(s));
                    if (!hasAnnulus) {
                        let lblWarn = createElement("span", "⚠️ Sin corona conectada, el carrier no puede orbitar en este modo.");
                        lblWarn.parent(bottomRow);
                        lblWarn.style("grid-column", "1 / -1");
                        lblWarn.style("font-size", "8px");
                        lblWarn.style("color", "#c0392b");
                    }
                }
            }
        }
    }

    // ==========================================
    // ANÁLISIS Y TREN DE REDUCCIÓN
    // ==========================================

    buildAnalysisSection(container) {
        // Botón de actualización
        let refreshBtn = createButton('🔄 Actualizar Análisis');
        refreshBtn.parent(container);
        this.styleBtn(refreshBtn, "#3498db");
        refreshBtn.style("width", "100%");
        refreshBtn.style("margin-bottom", "4px");
        refreshBtn.mousePressed(() => {
            this.buildAnalysisContent(container);
        });

        // Contenido inicial
        this.buildAnalysisContent(container);
    }

    buildAnalysisContent(container) {
        // Limpiar contenido previo (excepto el botón de actualizar si existe)
        let children = container.elt.children;
        for (let i = children.length - 1; i >= 0; i--) {
            // No eliminar el botón (que está en la posición 0)
            if (i > 0) {
                container.elt.removeChild(children[i]);
            }
        }

        if (!this.system.analysis) return;

        let summary = this.system.analysis.getSummary();

        // ---> ESTADÍSTICAS <---
        let statsDiv = createDiv();
        statsDiv.parent(container);
        statsDiv.style("display", "grid");
        statsDiv.style("grid-template-columns", "1fr 1fr");
        statsDiv.style("gap", "2px 8px");
        statsDiv.style("margin-bottom", "4px");
        statsDiv.style("background", "#f5f5f5");
        statsDiv.style("padding", "4px 6px");
        statsDiv.style("border-radius", "3px");

        let stats = [
            ["Ejes", summary.components.shafts],
            ["Engranajes", summary.components.gears],
            ["Engranamientos", summary.components.meshes],
            ["Correas", summary.components.belts],
            ["Eficiencia", (summary.efficiency * 100).toFixed(1) + "%"]
        ];
        if (summary.motor) {
            stats.push(["Motor ω", summary.motor.omega.toFixed(2)]);
            stats.push(["Motor Torque", summary.motor.torque.toFixed(3)]);
        }

        for (let [label, value] of stats) {
            let item = createDiv();
            item.parent(statsDiv);
            item.style("display", "flex");
            item.style("justify-content", "space-between");
            item.style("padding", "1px 0");

            let lbl = createSpan(label + ":");
            lbl.parent(item);
            lbl.style("color", "#555");
            lbl.style("font-size", "9px");

            let val = createSpan(String(value));
            val.parent(item);
            val.style("color", "#333");
            val.style("font-weight", "bold");
            val.style("font-size", "9px");
        }

        // ---> PROBLEMAS DE DISEÑO <---
        if (summary.issues && summary.issues.length > 0) {
            let issuesDiv = createDiv();
            issuesDiv.parent(container);
            issuesDiv.style("margin-top", "4px");
            issuesDiv.style("padding", "4px 6px");
            issuesDiv.style("border", "1px solid #e74c3c");
            issuesDiv.style("border-radius", "3px");
            issuesDiv.style("background", "#fde8e8");

            let title = createDiv("⚠️ Problemas detectados:");
            title.parent(issuesDiv);
            title.style("font-size", "9px");
            title.style("font-weight", "bold");
            title.style("color", "#c0392b");
            title.style("margin-bottom", "2px");

            for (let issue of summary.issues) {
                let item = createDiv("• " + issue.message);
                item.parent(issuesDiv);
                item.style("font-size", "8px");
                item.style("color", "#7f2a1f");
                item.style("padding", "1px 0");
                item.style("border-bottom", "1px solid #f5d5d5");
            }
        } else {
            let okDiv = createDiv();
            okDiv.parent(container);
            okDiv.style("margin-top", "4px");
            okDiv.style("padding", "4px 6px");
            okDiv.style("border", "1px solid #27ae60");
            okDiv.style("border-radius", "3px");
            okDiv.style("background", "#eafaf1");
            okDiv.style("text-align", "center");
            okDiv.style("color", "#1a7a3a");
            okDiv.style("font-size", "9px");
            okDiv.html("✅ No se detectaron problemas de diseño");
        }

        // ---> GRÁFICO DE VELOCIDADES <---
        let chartData = this.system.analysis.getSpeedChartData();
        if (chartData.length > 0) {
            let chartDiv = createDiv();
            chartDiv.parent(container);
            chartDiv.style("margin-top", "4px");
            chartDiv.style("padding", "4px 6px");
            chartDiv.style("background", "#f8f9fa");
            chartDiv.style("border-radius", "3px");
            chartDiv.style("border", "1px solid #dee2e6");
            chartDiv.style("max-height", "120px");
            chartDiv.style("overflow-y", "auto");

            let chartTitle = createDiv("📈 Velocidades relativas:");
            chartTitle.parent(chartDiv);
            chartTitle.style("font-size", "9px");
            chartTitle.style("font-weight", "bold");
            chartTitle.style("margin-bottom", "2px");

            for (let item of chartData) {
                let barRow = createDiv();
                barRow.parent(chartDiv);
                barRow.style("display", "flex");
                barRow.style("align-items", "center");
                barRow.style("gap", "4px");
                barRow.style("font-size", "8px");
                barRow.style("margin", "1px 0");

                let label = createSpan(item.name + ":");
                label.parent(barRow);
                label.style("width", "60px");
                label.style("flex-shrink", "0");
                label.style("color", "#555");

                let barContainer = createDiv();
                barContainer.parent(barRow);
                barContainer.style("flex", "1");
                barContainer.style("height", "10px");
                barContainer.style("background", "#e9ecef");
                barContainer.style("border-radius", "2px");
                barContainer.style("overflow", "hidden");

                let bar = createDiv();
                bar.parent(barContainer);
                let widthPercent = (item.normalized || 0) * 100;
                bar.style("width", Math.max(widthPercent, 2) + "%");
                bar.style("height", "100%");
                bar.style("background", item.isDriver ? "#f39c12" : "#3498db");
                bar.style("border-radius", "2px");

                let valLabel = createSpan(item.omega.toFixed(2));
                valLabel.parent(barRow);
                valLabel.style("width", "35px");
                valLabel.style("text-align", "right");
                valLabel.style("font-size", "8px");
                valLabel.style("color", "#333");
                valLabel.style("flex-shrink", "0");
            }
        }

            // ==========================================
            // TREN DE REDUCCIÓN (AÑADIR ESTO)
            // ==========================================
            if (this.selectedNode && !(this.selectedNode instanceof LinearGuide)) {
                let hasGear = this.selectedNode.components.find(c => c instanceof Gear);
                if (hasGear) {
                    let chainDiv = createDiv();
                    chainDiv.parent(container);
                    chainDiv.style("margin-top", "6px");
                    chainDiv.style("padding", "4px 6px");
                    chainDiv.style("background", "#f8f9fa");
                    chainDiv.style("border-radius", "3px");
                    chainDiv.style("border", "1px solid #dee2e6");
                    chainDiv.style("font-size", "10px");
        
                    let chainTitle = createDiv("🔗 Tren de Reducción:");
                    chainTitle.parent(chainDiv);
                    chainTitle.style("font-weight", "bold");
                    chainTitle.style("margin-bottom", "2px");
                    chainTitle.style("font-size", "10px");
        
                    let kinData = this.system.getKinematicData(this.selectedNode);
        
                    if (!kinData) {
                        let msg = createDiv("<i style='color:#888; font-size:9px;'>Componente sin engranajes conectados.</i>");
                        msg.parent(chainDiv);
                    } else if (kinData.isMotor) {
                        let msg = createDiv("<b style='color:#e67e22; font-size:10px;'>⚡ Fuente de energía (Motor)</b>");
                        msg.parent(chainDiv);
                    } else {
                        let energyPath = kinData.energyPath || [];
                        let htmlString = "";
        
                        if (energyPath.length === 0) {
                            htmlString = "<i style='color:#888; font-size:9px;'>Sin ruta cinemática.</i>";
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
                        resultDiv.style("font-size", "10px");
                        resultDiv.style("font-weight", "bold");
                        resultDiv.style("color", "#2980b9");
                        resultDiv.style("margin-top", "2px");
        
                        let r = kinData.totalRatio;
                        let displayRatio;
                        if (kinData.isExact && kinData.exactNum && kinData.exactDen) {
                            // Fracción exacta a partir de los dientes reales (no una aproximación
                            // del decimal): reducida por MCD, puede dar "17/53" y no solo "1/N".
                            let gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
                            let g = gcd(kinData.exactNum, kinData.exactDen) || 1;
                            let num = kinData.exactNum / g;
                            let den = kinData.exactDen / g;
                            displayRatio = (num === 1) ? `1/${den}` : (den === 1) ? `x${num}` : `${num}/${den}`;
                        } else {
                            // Camino con correa/corona u otro enlace no entero: no hay fracción
                            // exacta posible, se mantiene el decimal de siempre.
                            displayRatio = (r >= 1) ? `x${r.toFixed(2)}` : `1/${Math.round(1 / r)}`;
                        }
                        resultDiv.html(`Reducción Total: ${displayRatio}`);
                    }
                }
            }
        }

    // ==========================================
    // SECCIÓN ELIMINAR
    // ==========================================

    buildDeleteSection(container) {
        if (!this.selectedNode || this.selectedNode instanceof LinearGuide) {
            let msg = createDiv("<i style='color:#888; font-size:10px;'>Selecciona un eje para eliminar.</i>");
            msg.parent(container);
            return;
        }

        let row = createDiv();
        row.parent(container);
        row.style("display", "flex");
        row.style("gap", "4px");
        row.style("flex-wrap", "wrap");

        if (this.selectedComponent) {
            this.addBtn(row, "🗑️ Componente", "#c0392b", () => {
                if (this.selectedComponent instanceof Gear) {
                    this.system.pushHistory();
                    this.system.removeGear(this.selectedComponent);
                } else if (this.selectedComponent instanceof Pulley) {
                    this.system.pushHistory();
                    this.system.removePulley(this.selectedComponent);
                } else if (this.selectedComponent instanceof Hand) {
                    this.system.pushHistory();
                    this.system.removeHand(this.selectedComponent);
                }
                this.selectedComponent = null;
                this.update();
            });
        }

        this.addBtn(row, "💣 Eje completo", "#922b21", () => {
            let shaftToDelete = this.selectedNode;
            this.setSelection(null);
            this.system.pushHistory();
            this.system.removeShaft(shaftToDelete);
            this.update();
        });
    }

    // ==========================================
    // UI COAXIAL
    // ==========================================

    showCoaxialSelector(shafts) {
        this.clearActiveStyles();
        this.coaxialOptions = shafts;
        this.selectedNode = null;
        this.update();
    }

    drawCoaxialUI() {
        this.addSectionTitle("📍 Punto Coaxial (Selecciona)");
        let row = createDiv();
        row.parent(this.editor);
        row.style("display", "flex");
        row.style("gap", "4px");
        row.style("flex-wrap", "wrap");
        row.style("margin-bottom", "6px");

        for (let shaft of this.coaxialOptions) {
            let label = shaft.name || ("S" + shaft.id);
            let velInfo = nf(shaft.omega, 1, 1);
            let btn = createButton(`🔵 ${label} (ω:${velInfo})`);
            btn.parent(row);
            this.styleBtn(btn, "#34495e");
            btn.mousePressed(() => {
                this.coaxialOptions = [];
                this.setSelection(shaft);
            });
        }

        let btnCancel = createButton("❌ Cancelar");
        btnCancel.parent(row);
        this.styleBtn(btnCancel, "#c0392b");
        btnCancel.mousePressed(() => {
            this.coaxialOptions = [];
            this.update();
        });
    }

    // ==========================================
    // AUDIO UI (Colapsable)
    // ==========================================

    updateAudioUI() {
        this.audioContainer.html("");
        if (!this.audioPanelOpen) {
            this.audioContainer.hide();
            if (this.audioToggleBtn) {
                this.audioToggleBtn.html('🔊');
                this.styleBtn(this.audioToggleBtn, "#7f8c8d");
            }
            return;
        }
        this.audioContainer.show();
        if (this.audioToggleBtn) {
            this.audioToggleBtn.html('🔊');
            // ✅ CORREGIDO: rojo quedaba reservado para "destructivo/irreversible"
            // (cancelar) — usarlo también como estado ON de un toggle generaba
            // ambigüedad. Ahora ON = naranja, igual que el resto de los toggles.
            this.styleBtn(this.audioToggleBtn, "#e67e22");
        }

        // Tipo de onda
        let row1 = createDiv();
        row1.parent(this.audioContainer);
        row1.style("display", "flex");
        row1.style("gap", "4px");
        row1.style("align-items", "center");
        row1.style("margin-bottom", "4px");

        let lblTipo = createElement("span", "Onda:");
        lblTipo.parent(row1);
        lblTipo.style("font-size", "9px");
        lblTipo.style("width", "30px");

        let selectOnda = createSelect();
        selectOnda.parent(row1);
        selectOnda.option('sine');
        selectOnda.option('triangle');
        selectOnda.option('square');
        selectOnda.option('sawtooth');
        selectOnda.option('custom (Duty)');
        selectOnda.value(soundType);
        selectOnda.style("flex", "1");
        selectOnda.style("font-size", "10px");
        selectOnda.style("padding", "2px");
        selectOnda.changed(() => { soundType = selectOnda.value(); });

        // Frecuencias Tic/Toc
        let rowFreq = createDiv();
        rowFreq.parent(this.audioContainer);
        rowFreq.style("display", "flex");
        rowFreq.style("gap", "4px");
        rowFreq.style("align-items", "center");
        rowFreq.style("margin-bottom", "4px");

        let lblTick = createElement("span", "Tic:");
        lblTick.parent(rowFreq);
        lblTick.style("font-size", "9px");
        lblTick.style("width", "25px");

        let inputTick = createInput(str(soundFreqTick), "number");
        inputTick.parent(rowFreq);
        inputTick.attribute("step", "50");
        inputTick.style("width", "45px");
        inputTick.style("font-size", "10px");
        inputTick.style("padding", "2px");
        inputTick.input(() => {
            let v = float(inputTick.value());
            if (!isNaN(v)) soundFreqTick = v;
        });

        let lblTock = createElement("span", "Toc:");
        lblTock.parent(rowFreq);
        lblTock.style("font-size", "9px");
        lblTock.style("width", "25px");

        let inputTock = createInput(str(soundFreqTock), "number");
        inputTock.parent(rowFreq);
        inputTock.attribute("step", "50");
        inputTock.style("width", "45px");
        inputTock.style("font-size", "10px");
        inputTock.style("padding", "2px");
        inputTock.input(() => {
            let v = float(inputTock.value());
            if (!isNaN(v)) soundFreqTock = v;
        });

        // Decay y Volumen
        let row2 = createDiv();
        row2.parent(this.audioContainer);
        row2.style("display", "flex");
        row2.style("gap", "4px");
        row2.style("align-items", "center");
        row2.style("margin-bottom", "4px");

        let lblDecay = createElement("span", "Caida:");
        lblDecay.parent(row2);
        lblDecay.style("font-size", "9px");
        lblDecay.style("width", "30px");

        let inputDecay = createInput(str(soundDecay), "number");
        inputDecay.parent(row2);
        inputDecay.attribute("step", "0.01");
        inputDecay.style("width", "45px");
        inputDecay.style("font-size", "10px");
        inputDecay.style("padding", "2px");
        inputDecay.input(() => {
            let v = float(inputDecay.value());
            if (!isNaN(v)) soundDecay = v;
        });

        let lblVol = createElement("span", "Vol:");
        lblVol.parent(row2);
        lblVol.style("font-size", "9px");
        lblVol.style("width", "25px");

        let sliderVol = createSlider(0, 100, soundVolume * 100, 1);
        sliderVol.parent(row2);
        sliderVol.style("flex", "1");
        sliderVol.input(() => {
            soundVolume = sliderVol.value() / 100;
        });
    }

    // ==========================================
    // ANÁLISIS UI (Colapsable)
    // ==========================================

    updateAnalysisUI() {
        this.analysisContainer.html("");
        if (!this.analysisPanelOpen) {
            this.analysisContainer.hide();
            if (this.analysisToggleBtn) {
                this.analysisToggleBtn.html('📊');
                // ✅ CORREGIDO: antes OFF=morado (reservado para "crear/conectar
                // mecanismo") y ON=rojo (reservado para "destructivo"). Ninguno
                // de los dos significados aplicaba realmente acá — es un
                // toggle simple, así que pasa al mismo esquema gris/naranja.
                this.styleBtn(this.analysisToggleBtn, "#bdc3c7");
            }
            return;
        }
        this.analysisContainer.show();
        if (this.analysisToggleBtn) {
            this.analysisToggleBtn.html('📊');
            this.styleBtn(this.analysisToggleBtn, "#e67e22");
        }

        // Botón para abrir el análisis en el editor
        let btn = createButton('📊 Abrir Análisis Completo');
        btn.parent(this.analysisContainer);
        this.styleBtn(btn, "#8e44ad");
        btn.style("width", "100%");
        btn.mousePressed(() => {
            this.sections.analysis = true;
            this.updateEditor();
        });
    }

    // ==========================================
    // ESTILOS Y UTILIDADES
    // ==========================================

    addSectionTitle(text) {
        let t = createDiv(`<b style="color:#555; font-size:10px; text-transform:uppercase;">${text}</b>`);
        t.parent(this.editor);
        t.style("margin-bottom", "3px");
    }

    addSeparator() {
        let hr = createDiv("<hr style='border:0; border-top:1px solid #eee; margin:4px 0;'>");
        hr.parent(this.editor);
    }

    addBtn(parentDiv, text, color, callback) {
        let b = createButton(text);
        b.parent(parentDiv);
        this.styleBtn(b, color);
        b.mousePressed(callback);
        return b;
    }

    styleBtn(btn, color = "#34495e") {
        btn.style("padding", "4px 6px");
        btn.style("background", color);
        btn.style("color", "white");
        btn.style("border", "none");
        btn.style("border-radius", "3px");
        btn.style("cursor", "pointer");
        btn.style("font-size", "10px");
        btn.style("flex-shrink", "0");
        btn.style("transition", "0.2s");
        btn.mouseOver(() => {
            btn.style("opacity", "0.85");
        });
        btn.mouseOut(() => {
            btn.style("opacity", "1");
        });
    }

    // Estilo para un botón que quedó "armado", esperando que el usuario haga clic
    // en el componente destino (engranar, cremallera, polea, escape con varios péndulos).
    // Se aplica directamente sobre el botón (feedback inmediato, sin esperar un
    // refresco completo del panel) y también se re-aplica al reconstruir el panel
    // mientras el modo siga activo (ver los "if" al crear cada botón más arriba).
    setWaitingStyle(btn) {
        btn.style("opacity", "0.5");
        btn.style("cursor", "wait");
        btn.style("border", "1px dashed white");
    }

    clearActiveStyles() {
        if (this.system.connectionMode) this.system.endConnection();
        if (this.system.pulleyConnectionMode) this.system.endPulleyConnection();
        if (this.system.rackConnectionMode) this.system.endRackConnection();
        if (this.system.pendulumSelectionMode) {
            this.system.pendulumSelectionMode = false;
            this.system.pendingEscapeGear = null;
        }
    }
}