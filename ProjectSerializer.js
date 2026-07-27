// ==========================================
// PROJECT SERIALIZER - Guardado y carga de proyectos
// ==========================================
// Extraído de MechanicalSystem.js (que se estaba volviendo un "god object" de
// ~1400 líneas). Misma responsabilidad, mismo comportamiento, solo que ahora
// vive en su propia clase, siguiendo el mismo patrón de composición que ya usan
// ComponentFactory / TopologyManager / InteractionManager / AnalysisTools:
// MechanicalSystem mantiene métodos delgados que delegan aquí, para no romper
// nada del código externo que llama system.saveProject(), system.loadProject(), etc.

class ProjectSerializer {

    constructor(system) {
        this.system = system;
    }

    // ==========================================
    // FORMATO ACTUAL (v9.0) - metadata + session + design
    // ==========================================

    save(projectName = "Mi Reloj") {
        const system = this.system;

        // ---> REPARAR IDs <---
        system.shafts.forEach((s, i) => { if (!s.id) s.id = 10000 + i; });
        system.gears.forEach((g, i) => { if (!g.id) g.id = 20000 + i; });
        system.pendulums.forEach((p, i) => { if (!p.id) p.id = 30000 + i; });

        let project = {
            metadata: {
                name: projectName || "Mi Reloj",
                author: "Usuario",
                date: new Date().toISOString(),
                version: "9.0",
                description: "Diseño de mecanismo exportado desde Simulador de Relojería"
            },
            session: {
                camera: {
                    x: typeof camX !== 'undefined' ? camX : 0,
                    y: typeof camY !== 'undefined' ? camY : 0,
                    zoom: typeof zoom !== 'undefined' ? zoom : 1
                },
                audio: {
                    type: typeof soundType !== 'undefined' ? soundType : 'square',
                    freqTick: typeof soundFreqTick !== 'undefined' ? soundFreqTick : 1200,
                    freqTock: typeof soundFreqTock !== 'undefined' ? soundFreqTock : 800,
                    decay: typeof soundDecay !== 'undefined' ? soundDecay : 0.04,
                    volume: typeof soundVolume !== 'undefined' ? soundVolume : 0.4
                },
                ui: {
                    activePlane: typeof activePlane !== 'undefined' ? activePlane : null
                }
            },
            design: {
                shafts: [],
                gears: [],
                meshes: [],
                pendulums: [],
                escapements: [],
                hands: [],
                totalTicks: system.totalTicks || 0
            }
        };

        // 1. Guardar ejes
        for (let s of system.shafts) {
            project.design.shafts.push({
                id: s.id,
                x: s.x,
                y: s.y,
                angle: s.angle,
                omega: s.omega,
                isDriver: s.isDriver,
                isLocked: s.isLocked || false,
                name: s.name || "Eje " + s.id
            });
        }

        // 2. Guardar engranajes
        for (let g of system.gears) {
            if (!g.shaft) continue;
            project.design.gears.push({
                id: g.id,
                shaftId: g.shaft.id,
                teeth: g.teeth,
                module: g.module,
                name: g.name || "Engranaje",
                plane: g.plane || 0
            });
        }

        // 3. Guardar mallas
        for (let m of system.meshes) {
            project.design.meshes.push({
                driverId: m.driver.id,
                drivenId: m.driven.id
            });
        }

        // 4. Guardar péndulos
        for (let p of system.pendulums) {
            project.design.pendulums.push({
                id: p.id,
                shaftId: p.shaft.id,
                length: p.length,
                amplitude: p.amplitude,
                frequency: p.frequency
            });
        }

        // 5. Guardar escapes
        for (let e of system.escapements) {
            project.design.escapements.push({
                pendulumId: e.pendulum.id,
                escapeGearId: e.escapeGear.id,
                type: e.type || 'swiss'
            });
        }

        // 6. Guardar agujas
        for (let h of system.hands) {
            if (!h.shaft) continue;
            project.design.hands.push({
                shaftId: h.shaft.id,
                type: h.type,
                color: h.color,
                strokeW: h.strokeW,
                length: h.length,
                tailLength: h.tailLength
            });
        }

        return JSON.stringify(project, null, 2);
    }

    load(jsonStr) {
        const system = this.system;
        let data = JSON.parse(jsonStr);

        console.log("📂 Cargando proyecto...");

        // Si no tiene metadata, es formato antiguo
        if (!data.metadata) {
            console.log("📂 Formato antiguo detectado. Reparando...");
            data = this.repairLegacyFormat(data);
        }

        // ✅ Verificar que design existe
        if (!data.design) {
            console.error("❌ No se encontró 'design' en el archivo.");
            return;
        }

        console.log("📂 Ejes en diseño:", data.design.shafts ? data.design.shafts.length : 0);

        // ✅ Cargar diseño directamente (sin validaciones intermedias)
        this.loadDesign(data.design);

        // ✅ Restaurar sesión
        if (data.session) {
            this.restoreSession(data.session);
        }

        system.afterGeometryChange();
        console.log("✅ Proyecto cargado correctamente.");
    }

    repairLegacyFormat(oldData) {
        // El formato antiguo era directamente el diseño
        return {
            metadata: {
                name: "Diseño importado (formato antiguo)",
                author: "Desconocido",
                date: new Date().toISOString(),
                version: "legacy",
                description: "Importado desde formato anterior a V9.0"
            },
            session: {
                camera: { x: 0, y: 0, zoom: 1 },
                audio: { type: 'square', freqTick: 1200, freqTock: 800, decay: 0.04, volume: 0.4 },
                ui: { activePlane: null }
            },
            design: oldData  // El contenido antiguo pasa a design
        };
    }

    restoreSession(session) {
        if (session.camera) {
            if (typeof camX !== 'undefined') camX = session.camera.x || 0;
            if (typeof camY !== 'undefined') camY = session.camera.y || 0;
            if (typeof zoom !== 'undefined') zoom = session.camera.zoom || 1;
        }
        if (session.audio) {
            if (typeof soundType !== 'undefined') soundType = session.audio.type || 'square';
            if (typeof soundFreqTick !== 'undefined') soundFreqTick = session.audio.freqTick || 1200;
            if (typeof soundFreqTock !== 'undefined') soundFreqTock = session.audio.freqTock || 800;
            if (typeof soundDecay !== 'undefined') soundDecay = session.audio.decay || 0.04;
            if (typeof soundVolume !== 'undefined') soundVolume = session.audio.volume || 0.4;
        }
        if (session.ui && typeof activePlane !== 'undefined') {
            activePlane = session.ui.activePlane !== undefined ? session.ui.activePlane : null;
        }
    }

    loadDesign(design) {
        const system = this.system;

        // LIMPIAR SISTEMA ACTUAL
        while (system.shafts.length > 0) system.deleteNodeCompletely(system.shafts[0]);
        this.resetComponentCounters();

        // Suprimir avisos de colisión mientras se reconstruye pieza por pieza: cada
        // createShaft()/mountGear() dispara afterGeometryChange(), y a mitad de la
        // reconstrucción las mallas todavía no existen — se reportarían pares como
        // "chocando" cuando en realidad van a quedar mallados en cuanto termine el bucle.
        system.suppressCollisionWarnings = true;

        let shaftMap = {};
        let gearMap = {};
        let pendulumMap = {};

        // ✅ Obtener arrays con fallback seguro
        let shafts = design.shafts || [];
        let gears = design.gears || [];

        console.log("📂 Reconstruyendo:", shafts.length, "ejes,", gears.length, "engranajes");

        // 1. Reconstruir Ejes
        for (let sData of design.shafts || []) {
            let s = system.createShaft(sData.x, sData.y);
            s.id = sData.id;
            s.angle = sData.angle || 0;
            s.omega = sData.omega || 0;
            s.isDriver = sData.isDriver || false;
            s.isLocked = sData.isLocked || false;
            s.name = sData.name || "Eje " + sData.id;
            shaftMap[sData.id] = s;
            Shaft.nextId = Math.max(Shaft.nextId, sData.id + 1);
        }

        // 2. Reconstruir Engranajes
        for (let gData of design.gears || []) {
            let g = new Gear(null, gData.teeth, gData.module, gData.name || "Engranaje", gData.plane || 0);
            g.id = gData.id;
            system.gears.push(g);
            if (shaftMap[gData.shaftId]) {
                system.mountGear(g, shaftMap[gData.shaftId]);
            }
            gearMap[gData.id] = g;
            Gear.nextId = Math.max(Gear.nextId, gData.id + 1);
        }

        // 3. Reconstruir Mallas
        for (let mData of design.meshes || []) {
            let driver = gearMap[mData.driverId];
            let driven = gearMap[mData.drivenId];
            if (driver && driven) system.createMesh(driver, driven);
        }

        // 4. Reconstruir Péndulos
        for (let pData of design.pendulums || []) {
            let p = new Pendulum(shaftMap[pData.shaftId], pData.length, pData.amplitude, pData.frequency);
            p.id = pData.id;
            system.pendulums.push(p);
            pendulumMap[pData.id] = p;
            Pendulum.nextId = Math.max(Pendulum.nextId, pData.id + 1);
        }

        // 5. Reconstruir Escapes
        for (let eData of design.escapements || []) {
            let p = pendulumMap[eData.pendulumId];
            let g = gearMap[eData.escapeGearId];
            if (p && g) system.createEscapement(p.shaft, g, eData.type || 'swiss');
        }

        // 6. Reconstruir Agujas
        for (let hData of design.hands || []) {
            let h = new Hand(hData.type);
            h.color = hData.color;
            h.strokeW = hData.strokeW;
            h.length = hData.length;
            h.tailLength = hData.tailLength;
            system.hands.push(h);
            if (shaftMap[hData.shaftId]) {
                system.mountHand(h, shaftMap[hData.shaftId]);
            }
        }

        system.totalTicks = design.totalTicks || 0;
        system.suppressCollisionWarnings = false; // Reactivar: la llamada final a afterGeometryChange() (en load()) ya corre sobre el modelo completo
    }

    resetComponentCounters() {
        // Reiniciar contadores estáticos
        Shaft.nextId = 1;
        Gear.nextId = 1;
        Pendulum.nextId = 1;
        // Si hay otros contadores, reiniciarlos aquí
        this.system.gearCounter = 0;
        this.system.pulleyCounter = 0;
        this.system.rackCounter = 0;
    }

    // ==========================================
    // FORMATO LEGADO (histórico, sin metadata/session - solo "design" plano)
    // Usado hoy por el motor de historial (Ctrl+Z) en InteractionManager, que
    // necesita snapshots rápidos sin el envoltorio completo de saveProject().
    // ==========================================

    saveLegacy() {
        const system = this.system;

        // ---> REPARACIÓN DE IDs VIEJOS <---
        system.shafts.forEach((s, i) => { if (!s.id) s.id = 10000 + i; });
        system.gears.forEach((g, i) => { if (!g.id) g.id = 20000 + i; });
        system.pendulums.forEach((p, i) => { if (!p.id) p.id = 30000 + i; });

        let data = {
            shafts: [],
            gears: [],
            meshes: [],
            pendulums: [],
            escapements: [],
            hands: [],
            totalTicks: system.totalTicks
        };

        // 1. Guardar ejes
        for (let s of system.shafts) {
            data.shafts.push({ id: s.id, x: s.x, y: s.y, angle: s.angle, omega: s.omega, isDriver: s.isDriver });
        }

        // 2. Guardar engranajes
        for (let g of system.gears) {
            if (!g.shaft) continue;
            data.gears.push({ id: g.id, shaftId: g.shaft.id, teeth: g.teeth, module: g.module, name: g.name, plane: g.plane });
        }

        // 3. Guardar mallas
        for (let m of system.meshes) {
            data.meshes.push({ driverId: m.driver.id, drivenId: m.driven.id });
        }

        // 4. Guardar péndulos
        for (let p of system.pendulums) {
            data.pendulums.push({ id: p.id, shaftId: p.shaft.id, length: p.length, amplitude: p.amplitude, frequency: p.frequency });
        }

        // 5. Guardar escapes
        for (let e of system.escapements) {
            data.escapements.push({ pendulumId: e.pendulum.id, escapeGearId: e.escapeGear.id, type: e.type || 'swiss' });
        }

        // 6. Guardar agujas (Hands)
        for (let h of system.hands) {
            if (!h.shaft) continue;
            data.hands.push({
                shaftId: h.shaft.id,
                type: h.type,
                color: h.color,
                strokeW: h.strokeW,
                length: h.length,
                tailLength: h.tailLength
            });
        }

        return JSON.stringify(data, null, 2);
    }

    loadLegacy(jsonStr) {
        const system = this.system;
        let data = JSON.parse(jsonStr);

        // LIMPIAR SISTEMA ACTUAL
        while (system.shafts.length > 0) system.deleteNodeCompletely(system.shafts[0]);
        this.resetComponentCounters();
        system.suppressCollisionWarnings = true; // Ver nota en loadDesign()

        // Mapas para buscar rápidamente por ID durante la reconstrucción
        let shaftMap = {};
        let gearMap = {};
        let pendulumMap = {};

        // 1. Reconstruir Ejes
        for (let sData of data.shafts) {
            let s = system.createShaft(sData.x, sData.y);
            s.id = sData.id;
            s.angle = sData.angle || 0;
            s.omega = sData.omega || 0;
            s.isDriver = sData.isDriver || false;
            shaftMap[sData.id] = s;
            Shaft.nextId = Math.max(Shaft.nextId, sData.id + 1);
        }

        // 2. Reconstruir Engranajes y montarlos
        for (let gData of data.gears) {
            let g = new Gear(null, gData.teeth, gData.module, gData.name, gData.plane);
            g.id = gData.id;
            system.gears.push(g);
            system.mountGear(g, shaftMap[gData.shaftId]);
            gearMap[gData.id] = g;
            Gear.nextId = Math.max(Gear.nextId, gData.id + 1);
        }

        // 3. Reconstruir Mallas
        for (let mData of data.meshes) {
            let driver = gearMap[mData.driverId];
            let driven = gearMap[mData.drivenId];
            if (driver && driven) system.createMesh(driver, driven);
        }

        // 4. Reconstruir Péndulos
        for (let pData of data.pendulums) {
            let p = new Pendulum(shaftMap[pData.shaftId], pData.length, pData.amplitude, pData.frequency);
            p.id = pData.id;
            system.pendulums.push(p);
            pendulumMap[pData.id] = p;
            Pendulum.nextId = Math.max(Pendulum.nextId, pData.id + 1);
        }

        // 5. Reconstruir Escapes (Al final, para que encuentre los componentes)
        for (let eData of data.escapements) {
            let p = pendulumMap[eData.pendulumId];
            let g = gearMap[eData.escapeGearId];
            if (p && g) system.createEscapement(p.shaft, g, eData.type || 'swiss');
        }

        // 6. Reconstruir Agujas
        if (data.hands) {
            for (let hData of data.hands) {
                let h = new Hand(hData.type);
                h.color = hData.color;
                h.strokeW = hData.strokeW;
                h.length = hData.length;
                h.tailLength = hData.tailLength;
                system.hands.push(h);
                system.mountHand(h, shaftMap[hData.shaftId]);
            }
        }

        // Restaurar el tiempo
        system.totalTicks = data.totalTicks || 0;

        system.suppressCollisionWarnings = false; // Reactivar antes de la pasada final
        system.afterGeometryChange();
    }
}