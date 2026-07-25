// PRUEBA**********************

// ==========================================
// SCRIPT DE PRUEBAS - ESCAPEMENT VALIDATION
// ==========================================

// Función de prueba que usa el sistema global
function testEscapementValidation() {
    console.log("🧪 INICIANDO PRUEBAS DE VALIDACIÓN DE ESCAPE");
    console.log("============================================");
    
    // Guardar referencia al sistema
    let system = window.system;
    
    // Limpiar sistema
    while(system.shafts.length > 0) {
        system.deleteNodeCompletely(system.shafts[0]);
    }
    
    let results = [];
    
    // ==========================================
    // PRUEBA 1: Creación exitosa
    // ==========================================
    console.log("\n📝 PRUEBA 1: Creación exitosa");
    let motorShaft = system.createShaft(0, 0);
    let motorGear = system.addGearToShaft(motorShaft, 20);
    motorShaft.isDriver = true;
    motorShaft.omega = 2;
    
    let pendShaft = system.createShaft(100, 100);
    let pend = system.createPendulum(pendShaft);
    
    let escapeShaft = system.createShaft(200, 100);
    let escapeGear = system.addGearToShaft(escapeShaft, 30);
    
    system.connectGears(motorGear, escapeGear);
    
    let esc1 = system.createEscapement(pendShaft, escapeGear);
    results.push({
        test: "Creación exitosa",
        passed: esc1 !== null && esc1 !== undefined,
        message: esc1 ? "✅ Escape creado" : "❌ Falló"
    });
    
    // ==========================================
    // PRUEBA 2: Péndulo sin escape (NO tiene péndulo)
    // ==========================================
    console.log("\n📝 PRUEBA 2: Péndulo sin péndulo (eje vacío)");
    let noPendShaft = system.createShaft(300, 0);
    let noPendEscGear = system.addGearToShaft(noPendShaft, 20);
    
    let esc2 = system.createEscapement(noPendShaft, noPendEscGear);
    results.push({
        test: "Eje sin péndulo",
        passed: esc2 === null,
        message: esc2 ? "❌ Debería fallar" : "✅ Falló correctamente"
    });
    
    // ==========================================
    // PRUEBA 3: Mismo eje péndulo y escape
    // ==========================================
    console.log("\n📝 PRUEBA 3: Mismo eje");
    let sameShaft = system.createShaft(400, 0);
    let samePend = system.createPendulum(sameShaft);
    let sameGear = system.addGearToShaft(sameShaft, 20);
    
    let esc3 = system.createEscapement(sameShaft, sameGear);
    results.push({
        test: "Mismo eje péndulo y escape",
        passed: esc3 === null,
        message: esc3 ? "❌ Debería fallar" : "✅ Falló correctamente"
    });
    
    // ==========================================
    // PRUEBA 4: Péndulo con escape existente
    // ==========================================
    console.log("\n📝 PRUEBA 4: Péndulo con escape existente");
    let pend2Shaft = system.createShaft(500, 100);
    let pend2 = system.createPendulum(pend2Shaft);
    let esc4Shaft = system.createShaft(600, 100);
    let esc4Gear = system.addGearToShaft(esc4Shaft, 20);
    
    let esc4a = system.createEscapement(pend2Shaft, esc4Gear);
    let esc4b = system.createEscapement(pend2Shaft, esc4Gear);
    results.push({
        test: "Péndulo con escape existente (segundo intento)",
        passed: esc4b === null,
        message: esc4b ? "❌ Debería fallar" : "✅ Falló correctamente"
    });
    
    // ==========================================
    // PRUEBA 5: Rueda de escape sin engranajes conectados (solo advertencia)
    // ==========================================
    console.log("\n📝 PRUEBA 5: Sin engranajes conectados (advertencia)");
    let pend3Shaft = system.createShaft(700, 200);
    let pend3 = system.createPendulum(pend3Shaft);
    let esc5Shaft = system.createShaft(800, 200);
    let esc5Gear = system.addGearToShaft(esc5Shaft, 12);
    // ⚠️ NO conectamos a nada
    
    let esc5 = system.createEscapement(pend3Shaft, esc5Gear);
    results.push({
        test: "Sin engranajes conectados (debe mostrar advertencia)",
        passed: esc5 !== null,
        message: esc5 ? "✅ Creado con advertencia" : "❌ Falló inesperadamente"
    });
    
    // ==========================================
    // PRUEBA 6: Rueda de escape ya usada
    // ==========================================
    console.log("\n📝 PRUEBA 6: Rueda de escape ya usada");
    let pend4Shaft = system.createShaft(900, 300);
    let pend4 = system.createPendulum(pend4Shaft);
    // Intentar usar el mismo escapeGear de la prueba 1
    let esc6 = system.createEscapement(pend4Shaft, escapeGear);
    results.push({
        test: "Rueda de escape ya usada",
        passed: esc6 === null,
        message: esc6 ? "❌ Debería fallar" : "✅ Falló correctamente"
    });
    
    // ==========================================
    // RESUMEN DE PRUEBAS
    // ==========================================
    console.log("\n============================================");
    console.log("📊 RESUMEN DE PRUEBAS");
    console.log("============================================");
    
    let passed = results.filter(r => r.passed).length;
    let total = results.length;
    
    for (let r of results) {
        console.log((r.passed ? "✅" : "❌") + " " + r.test + ": " + r.message);
    }
    
    console.log("============================================");
    console.log("✅ " + passed + "/" + total + " pruebas pasaron");
    console.log((passed === total) ? "🎉 TODAS LAS PRUEBAS PASARON" : "⚠️ " + (total - passed) + " pruebas fallaron");
    
    return results;


// Hacer la función accesible globalmente
window.testEscapementValidation = testEscapementValidation;

console.log("🧪 Script de pruebas cargado.");
console.log("📝 Ejecuta: testEscapementValidation() en la consola");
}

// Script de prueba (ejecutar en consola)
function testPendulumCrossing() {
    let system = window.system;
    let shaft = system.createShaft(0, 0);
    let pend = new Pendulum(shaft, 100, PI/6, 1);
    
    // Caso 1: Cruce normal
    pend.lastTickAngle = -0.1;
    pend.currentAngle = 0.1;
    pend.angularVelocity = 1;
    console.log("Cruce normal:", pend.isAtCenter() ? "✅" : "❌");
    
    // Caso 2: Salto grande (dt variable)
    pend.lastTickAngle = -0.5;
    pend.currentAngle = 0.5;
    pend.angularVelocity = 1;
    console.log("Salto grande:", pend.isAtCenter() ? "✅" : "❌");
    
    // Caso 3: Sin cruce
    pend.lastTickAngle = -0.5;
    pend.currentAngle = -0.3;
    pend.angularVelocity = 1;
    console.log("Sin cruce:", !pend.isAtCenter() ? "✅" : "❌");
    
    // Caso 4: Velocidad baja (ignorar)
    pend.lastTickAngle = -0.1;
    pend.currentAngle = 0.1;
    pend.angularVelocity = 0.1;
    console.log("Velocidad baja:", !pend.isAtCenter() ? "✅" : "❌");
}


// ==========================================
// PRUEBA: CACHE DE ENLACES
// ==========================================

window.testLinksCache = function() {
    console.log("🧪 Probando Cache de Enlaces...");
    console.log("============================================");
    
    let system = window.system;
    
    // PRUEBA 1: Primera llamada - debe construir cache
    console.log("\n📝 PRUEBA 1: Primera llamada");
    system.linksDirty = true; // Forzar reconstrucción
    let links1 = system.getLinks();
    console.log("  linksCache construido:", system.linksCache.length > 0 ? "✅" : "❌");
    console.log("  linksDirty:", system.linksDirty ? "❌ (debería ser false)" : "✅");
    
    // PRUEBA 2: Segunda llamada - debe usar cache
    console.log("\n📝 PRUEBA 2: Segunda llamada (usa cache)");
    let links2 = system.getLinks();
    console.log("  Misma referencia?", links1 === links2 ? "✅" : "❌");
    console.log("  linksDirty:", system.linksDirty ? "❌" : "✅");
    
    // PRUEBA 3: Forzar cambio de topología
    console.log("\n📝 PRUEBA 3: Forzar cambio de topología");
    system.linksDirty = true;
    let links3 = system.getLinks();
    console.log("  Cache reconstruido (diferente referencia):", links1 !== links3 ? "✅" : "❌");
    console.log("  linksDirty:", system.linksDirty ? "❌" : "✅");
    
    // PRUEBA 4: afterGeometryChange() marca como sucio
    console.log("\n📝 PRUEBA 4: afterGeometryChange() marca cache como sucio");
    system.linksDirty = false;
    system.afterGeometryChange();
    console.log("  linksDirty después de afterGeometryChange():", system.linksDirty ? "✅" : "❌");
    
    // PRUEBA 5: Verificar que getLinks() reconstruye después de afterGeometryChange()
    console.log("\n📝 PRUEBA 5: getLinks() reconstruye después de afterGeometryChange()");
    let links4 = system.getLinks();
    console.log("  linksDirty:", system.linksDirty ? "❌" : "✅");
    console.log("  Cache reconstruido:", links4.length > 0 ? "✅" : "❌");
    
    console.log("\n============================================");
    console.log("✅ Pruebas de Cache completadas.");
};


window.testLinksCacheWithGears = function() {
    console.log("🧪 Probando Cache con engranajes...");
    let system = window.system;
    
    // Crear algunos engranajes para que el cache tenga datos
    console.log("📝 Creando engranajes de prueba...");
    let s1 = system.createShaft(0, 0);
    let g1 = system.addGearToShaft(s1, 20);
    let s2 = system.createShaft(100, 0);
    let g2 = system.addGearToShaft(s2, 30);
    system.connectGears(g1, g2);
    
    // Forzar reconstrucción del cache
    system.linksDirty = true;
    let links1 = system.getLinks();
    console.log("  linksCache construido:", system.linksCache.length > 0 ? "✅" : "❌");
    console.log("  linksDirty:", system.linksDirty ? "❌ (debería ser false)" : "✅");
    console.log("  Enlaces en cache:", system.linksCache.length);
    
    // Probar afterGeometryChange
    system.linksDirty = false;
    system.afterGeometryChange();
    console.log("  linksDirty después de afterGeometryChange():", system.linksDirty ? "✅" : "❌");
    
    // Reconstruir
    let links2 = system.getLinks();
    console.log("  Cache reconstruido:", system.linksCache.length > 0 ? "✅" : "❌");
    console.log("  linksDirty:", system.linksDirty ? "❌" : "✅");
};



window.testJSONRepair = function() {
    console.log("🧪 Probando reparación de JSON...");
    let system = window.system;
    
    // Crear JSON corrupto a propósito
    let corruptJSON = {
        shafts: [{ id: 1, x: 0, y: 0, angle: 0, omega: 0, isDriver: false }],
        gears: [
            { id: 101, shaftId: 1, teeth: 20, module: 5, name: "E1", plane: 0 },
            { id: 102, shaftId: 999, teeth: 30, module: 5, name: "E2", plane: 0 } // ← eje inexistente
        ],
        meshes: [
            { driverId: 101, drivenId: 102 },
            { driverId: 999, drivenId: 101 } // ← engranaje inexistente
        ],
        pendulums: [
            { id: 201, shaftId: 999, length: 150, amplitude: 0.5, frequency: 1 } // ← eje inexistente
        ],
        escapements: [
            { pendulumId: 201, escapeGearId: 101 },
            { pendulumId: 999, escapeGearId: 101 } // ← péndulo inexistente
        ],
        hands: [
            { shaftId: 999, type: 'segundero', color: [200,0,0], strokeW: 1.5, length: 48, tailLength: 8 }
        ],
        totalTicks: 0
    };
    
    console.log("📝 JSON corrupto creado.");
    console.log("   - Eje 999 no existe");
    console.log("   - Engranaje 999 no existe");
    console.log("   - Péndulo 999 no existe");
    
    // Intentar cargar (debería reparar automáticamente)
    console.log("\n📝 Cargando JSON corrupto...");
    system.loadClockFromJSON(JSON.stringify(corruptJSON));
    
    // Verificar que solo sobrevivieron los elementos válidos
    console.log("\n📝 Verificando estado final:");
    console.log("   Ejes:", system.shafts.length === 1 ? "✅ (1)" : "❌ (" + system.shafts.length + ")");
    console.log("   Engranajes:", system.gears.length === 1 ? "✅ (1)" : "❌ (" + system.gears.length + ")");
    console.log("   Mallas:", system.meshes.length === 0 ? "✅ (0)" : "❌ (" + system.meshes.length + ")");
    console.log("   Péndulos:", system.pendulums.length === 0 ? "✅ (0)" : "❌ (" + system.pendulums.length + ")");
    console.log("   Escapes:", system.escapements.length === 0 ? "✅ (0)" : "❌ (" + system.escapements.length + ")");
    console.log("   Agujas:", system.hands.length === 0 ? "✅ (0)" : "❌ (" + system.hands.length + ")");
};

//********************************
//       TEST QUADTREE
//********************************

window.testSpatialIndex = function() {
    console.log("🧪 Probando Búsqueda Espacial (Quadtree)...");
    let system = window.system;
    
    // Limpiar y crear ejes en posiciones CONOCIDAS
    while(system.shafts.length > 0) system.deleteNodeCompletely(system.shafts[0]);
    
    console.log("📝 Creando ejes en posiciones conocidas...");
    let positions = [
        { x: 0, y: 0 },
        { x: 200, y: 200 },
        { x: -300, y: 100 },
        { x: 150, y: -250 },
        { x: 50, y: 50 }
    ];
    
    for (let pos of positions) {
        system.createShaft(pos.x, pos.y);
    }
    
    system.rebuildSpatialIndex();
    
    // Probar búsqueda en CADA posición
    console.log("\n📝 Probando búsqueda en cada posición:");
    let allFound = true;
    for (let pos of positions) {
        let found = system.interaction.findShaftAt(pos.x, pos.y);
        let status = found ? '✅' : '❌';
        if (!found) allFound = false;
        console.log(`   (${pos.x}, ${pos.y}): ${status} encontrado`);
    }
    
    // Probar que NO encuentra en una posición vacía
    console.log("\n📝 Probando búsqueda en posición vacía (500, 500):");
    let foundEmpty = system.interaction.findShaftAt(500, 500);
    console.log(`   (500, 500): ${foundEmpty ? '❌ (debería no encontrar)' : '✅ (correcto, no hay nada)'}`);
    
    console.log("\n📝 Estadísticas del quadtree:");
    console.log(`   Ejes: ${system.shafts.length}`);
    console.log(`   Posiciones creadas: ${positions.length}`);
    console.log(`   Todas encontradas: ${allFound ? '✅' : '❌'}`);
    
    console.log("\n✅ Prueba completada.");
};

//*******************************
// PRUEBAS CACHE
//*******************************

window.testRenderCache = function() {
    console.log("🧪 Probando Cache de Renderizado...");
    let system = window.system;
    let renderer = window.renderer;
    
    // Verificar que renderer existe
    if (!renderer) {
        console.error("❌ renderer no está definido. Asegúrate de que window.renderer esté asignado en setup().");
        return;
    }
    
    // Limpiar y crear algunos engranajes
    while(system.shafts.length > 0) system.deleteNodeCompletely(system.shafts[0]);
    
    console.log("📝 Creando 3 engranajes...");
    let s1 = system.createShaft(0, 0);
    let g1 = system.addGearToShaft(s1, 20);
    let s2 = system.createShaft(150, 0);
    let g2 = system.addGearToShaft(s2, 30);
    system.connectGears(g1, g2);
    
    // Verificar que renderer tiene el método
    if (typeof renderer.invalidateCache !== 'function') {
        console.error("❌ renderer.invalidateCache no existe. ¿Está implementado en Renderer.js?");
        return;
    }
    
    // Forzar renderizado
    renderer.invalidateCache();
    renderer.drawGear(g1);
    
    console.log("\n📝 Verificando cache:");
    let hash1 = renderer.getGearHash(g1);
    console.log(`   Hash engranaje 1: ${hash1}`);
    console.log(`   Cache existe: ${renderer.gearCache[hash1] ? '✅' : '❌'}`);
    
    // Cambiar dientes y verificar que el cache se invalida
    console.log("\n📝 Modificando dientes (debe invalidar cache):");
    renderer.cacheDirty = false;
    system.updateGearTeeth(g1, 25);
    console.log(`   cacheDirty después de updateGearTeeth(): ${renderer.cacheDirty ? '✅' : '❌'}`);
    
    // Forzar regeneración
    renderer.drawGear(g1);
    let hash2 = renderer.getGearHash(g1);
    console.log(`   Hash después del cambio: ${hash2}`);
    console.log(`   Hash diferente: ${hash1 !== hash2 ? '✅' : '❌'}`);
    console.log(`   Cache regenerado: ${renderer.gearCache[hash2] ? '✅' : '❌'}`);
    
    console.log("\n✅ Prueba completada.");
};