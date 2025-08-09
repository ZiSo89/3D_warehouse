/** Transitional RackBuilder: wraps existing createRacksInstanced logic so future refactor centralizes instancing. */
import * as THREE from 'three';

import { constants } from '../../core/constants.js';
import { TextureAtlasManager } from '../../core/TextureAtlasManager.js';
import { getLocationTypeColor } from '../../ui/theme.js';

/**
 * Unified RackBuilder: progressive refactor layer that can output either instanced or individual meshes
 * using a single pass location iterator. Existing createRacksInstanced/createRacks kept for backward compatibility.
 */
export class RackBuilder {
  constructor({ instanced = true } = {}) {
    this.instanced = instanced;
    this.textureAtlas = null;
  this._lastSignature = null;
  this._lastGroup = null;
  // --- incremental diff state (regular path only for now) ---
  this._shapeSignature = null; // structural aspects only
  this._moduleSigs = new Map(); // moduleKey -> signature
  }

  /** Build racks group from uiConfig + rule arrays.
   * @param {Object} uiConfig
   * @param {Array} missingLocations
   * @param {Array} locationTypes
   * @param {Object} [options]
   * @param {boolean} [options.forceIncremental] Force rebuild path (skip early full-group reuse) so diff logic can run
   */
  build(uiConfig, missingLocations = [], locationTypes = [], options = {}) {
    const signature = this.computeSignature(uiConfig, missingLocations, locationTypes);
    if (!options.forceIncremental && this._lastSignature && signature === this._lastSignature && this._lastGroup) {
      return this._lastGroup;
    }
    const start = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const group = this.instanced
      ? this.buildInstanced(uiConfig, missingLocations, locationTypes, { incremental: true, force: !!options.forceIncremental })
      : this.buildRegular(uiConfig, missingLocations, locationTypes, { incremental: true });
    const end = (typeof performance !== 'undefined') ? performance.now() : Date.now();
    const duration = +(end - start).toFixed(1);
    // Augment stats with duration
    if (this._lastStats) this._lastStats.durationMs = duration;
    this._lastSignature = signature;
    this._lastGroup = group;
    return group;
  }

  computeSignature(uiConfig, missing, types) {
    try {
      return [
        uiConfig.aisles,
        uiConfig.modules_per_aisle,
        uiConfig.locations_per_module,
        uiConfig.storage_depth,
        uiConfig.levels_per_aisle.join(','),
        missing.length,
        types.length
      ].join('|');
    } catch { return Math.random().toString(); }
  }

  // -------- Regular (non-instanced) path (lean wrapper around old logic) --------
  buildRegular(uiConfig, missingLocations, locationTypes, { incremental = false } = {}) {
    const shapeSig = this.computeShapeSignature(uiConfig);
    let group = this._lastGroup;
    const firstBuild = !group || !this._shapeSignature;
    const shapeChanged = this._shapeSignature && this._shapeSignature !== shapeSig;
    if (firstBuild || shapeChanged || !incremental) {
      // full rebuild
  group = new THREE.Group();
  group.add(new THREE.AmbientLight(0xffffff, 0.35));
  const hemi = new THREE.HemisphereLight(0xe0f4ff, 0x404040, 0.5); group.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.7); dir.position.set(12,18,10); dir.castShadow = false; group.add(dir);
      this._moduleSigs.clear();
      const moduleLength = uiConfig.locations_per_module * constants.locationLength;
      const totalRackDepth = uiConfig.storage_depth * constants.locationDepth;
      const rackAndAisleWidth = (totalRackDepth * 2) + constants.aisleWidth;
      for (let a=0;a<uiConfig.aisles;a++) {
        const levels = uiConfig.levels_per_aisle[a];
        for (let side=0; side<2; side++) {
          const rackLine = new THREE.Group();
          rackLine.userData.isRackLine = true;
          const isEast = side===1;
          rackLine.position.x = a * rackAndAisleWidth + (isEast ? totalRackDepth + constants.aisleWidth : 0);
          for (let l=0;l<levels;l++) {
            for (let m=0;m<uiConfig.modules_per_aisle;m++) {
              const moduleGroup = new THREE.Group();
              moduleGroup.position.z = m*moduleLength;
              const moduleKey = this.moduleKey(a,side,l,m);
              this.populateModuleGroup(moduleGroup, { uiConfig, a, side, l, m, missingLocations, locationTypes });
              moduleGroup.userData.moduleKey = moduleKey;
              rackLine.add(moduleGroup);
              // store signature
              const sig = this.computeModuleSignature({ uiConfig, a, side, l, m, missingLocations, locationTypes });
              this._moduleSigs.set(moduleKey, sig);
            }
          }
          group.add(rackLine);
        }
      }
      this._shapeSignature = shapeSig;
      // Better total modules: sum over aisles levels
      let moduleTotal = 0; for (let a=0;a<uiConfig.aisles;a++){const levels=uiConfig.levels_per_aisle[a]; moduleTotal += levels * uiConfig.modules_per_aisle * 2;}
      this._lastStats = { mode:'regular', changed: moduleTotal, totalModules: moduleTotal, changedPercent:100 };
      if (typeof window !== 'undefined' && window.dispatchEvent) {
  try { window.dispatchEvent(new CustomEvent('rackbuilder:stats', { detail: this._lastStats })); } catch { /* optional */ }
      }
      return group;
    }

    // incremental path: mutate existing module groups in place
    const changedModules = [];
    const moduleLength = uiConfig.locations_per_module * constants.locationLength;
    // traverse existing structure; assume layout unchanged
    for (let a=0;a<uiConfig.aisles;a++) {
      const levels = uiConfig.levels_per_aisle[a];
      for (let side=0; side<2; side++) {
        for (let l=0;l<levels;l++) {
          for (let m=0;m<uiConfig.modules_per_aisle;m++) {
            const moduleKey = this.moduleKey(a,side,l,m);
            const newSig = this.computeModuleSignature({ uiConfig, a, side, l, m, missingLocations, locationTypes });
            const prevSig = this._moduleSigs.get(moduleKey);
            if (newSig !== prevSig) {
              // find existing module group
              const moduleGroup = this.findModuleGroup(group, moduleKey);
              if (moduleGroup) {
                // rebuild contents
                while (moduleGroup.children.length) moduleGroup.remove(moduleGroup.children[0]);
                moduleGroup.position.z = m * moduleLength; // ensure position
                this.populateModuleGroup(moduleGroup, { uiConfig, a, side, l, m, missingLocations, locationTypes });
                this._moduleSigs.set(moduleKey, newSig);
                changedModules.push(moduleKey);
              }
            }
          }
        }
      }
    }
    if (changedModules.length) {
      // Updated modules
    } else {
      // No changes
    }
    // Emit stats for regular path
    let moduleTotal = 0; for (let a=0;a<uiConfig.aisles;a++){const levels=uiConfig.levels_per_aisle[a]; moduleTotal += levels * uiConfig.modules_per_aisle * 2;}
    this._lastStats = { mode:'regular', changed: changedModules.length, totalModules: moduleTotal, changedPercent: +(changedModules.length / (moduleTotal||1) * 100).toFixed(2) };
    if (typeof window !== 'undefined' && window.dispatchEvent) {
  try { window.dispatchEvent(new CustomEvent('rackbuilder:stats', { detail: this._lastStats })); } catch { /* optional */ }
    }
    return group;
  }

  moduleKey(a,side,l,m) { return `${a}:${side}:${l}:${m}`; }

  computeShapeSignature(uiConfig) {
    return [
      uiConfig.aisles,
      uiConfig.modules_per_aisle,
      uiConfig.locations_per_module,
      uiConfig.storage_depth,
      uiConfig.levels_per_aisle.join(',')
    ].join('|');
  }

  populateModuleGroup(moduleGroup, { uiConfig, a, side, l, m, missingLocations, locationTypes }) {
    const isEast = side===1;
    for (let d=0; d<uiConfig.storage_depth; d++) {
      for (let s=0; s<uiConfig.locations_per_module; s++) {
        if (this.matchMissing(a,l,m,d,s,missingLocations)) continue;
        const locType = this.matchLocationType(a,l,m,d,s,locationTypes) || 'Storage';
        const { color, emissive, emissiveIntensity } = getLocationTypeColor(locType, d);
        const geom = new THREE.BoxGeometry(
          constants.locationDepth * 0.8,
          constants.levelHeight * 0.8,
          constants.locationLength * 0.8
        );
  // Slight variation: service/buffer more matte, storage medium, others shinier
  let metalness = 0.5; let roughness = 0.55;
  if (locType === 'Buffer') { metalness = 0.35; roughness = 0.65; }
  else if (locType === 'Service') { metalness = 0.3; roughness = 0.6; }
  else if (locType === 'Pick') { metalness = 0.55; roughness = 0.5; }
  const mat = new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity, metalness, roughness });
        const mesh = new THREE.Mesh(geom, mat);
        const dIndex = isEast ? d : (uiConfig.storage_depth - 1 - d);
        mesh.position.set(
          (dIndex*constants.locationDepth)+(constants.locationDepth/2),
          (l*constants.levelHeight)+(constants.levelHeight/2),
          (s*constants.locationLength)+(constants.locationLength/2)
        );
        mesh.userData = { aisle:a, level:l, module:m, depth:d, position:s, type:locType };
        moduleGroup.add(mesh);
      }
    }
  }

  computeModuleSignature({ uiConfig, a, side, l, m, missingLocations, locationTypes }) {
    // build a lightweight string capturing presence + type distribution
    const parts = [a,side,l,m];
    for (let d=0; d<uiConfig.storage_depth; d++) {
      for (let s=0; s<uiConfig.locations_per_module; s++) {
        if (this.matchMissing(a,l,m,d,s,missingLocations)) { parts.push('x'); continue; }
        const locType = this.matchLocationType(a,l,m,d,s,locationTypes) || 'S'; // collapse Storage => S
        // take first 2 chars of type to reduce length
        parts.push(locType.slice(0,2));
      }
    }
    return parts.join('.');
  }

  findModuleGroup(group, moduleKey) {
    // Depth-first search; group is not huge for regular path
    const stack = [group];
    while (stack.length) {
      const g = stack.pop();
      if (g.userData && g.userData.moduleKey === moduleKey) return g;
      for (let i=0;i<g.children.length;i++) stack.push(g.children[i]);
    }
    return null;
  }

  // -------- Instanced path --------
  buildInstanced(uiConfig, missingLocations, locationTypes, { incremental = false, force = false } = {}) {
    if (!this.textureAtlas) {
      this.textureAtlas = new TextureAtlasManager();
      this.textureAtlas.createWarehouseMaterialAtlas();
    }
    // Incremental strategy: recompute bucket signatures; if unchanged -> reuse existing mesh.
    const prevGroup = this._lastGroup;
    const canIncrement = incremental && prevGroup;
    const prevMeshesByKey = new Map();
    if (canIncrement) {
      prevGroup.traverse(obj => {
        if (obj.isInstancedMesh && obj.userData && obj.userData.groupKey) {
          prevMeshesByKey.set(obj.userData.groupKey, obj);
        }
      });
    }
    const group = new THREE.Group();
  group.add(new THREE.AmbientLight(0xffffff, 0.32));
  group.add(new THREE.HemisphereLight(0xe0f4ff, 0x3a3a3a, 0.55));
  const d = new THREE.DirectionalLight(0xffffff,0.75); d.position.set(14,22,12); group.add(d);

    const locationGeometry = new THREE.BoxGeometry(
      constants.locationDepth * 0.8,
      constants.levelHeight * 0.8,
      constants.locationLength * 0.8
    );

    // group key => {positions:[], data:[], signature, mesh?}
    const buckets = new Map();
    const pushInstance = (key, pos, data) => {
      if (!buckets.has(key)) buckets.set(key,{positions:[],data:[],materialKey:key});
      const b = buckets.get(key); b.positions.push(pos); b.data.push(data);
    };

    const totalRackDepth = uiConfig.storage_depth * constants.locationDepth;
    const rackAndAisleWidth = (totalRackDepth * 2) + constants.aisleWidth;

    const moduleLength = uiConfig.locations_per_module * constants.locationLength;

    for (let a=0;a<uiConfig.aisles;a++) {
      const levels = uiConfig.levels_per_aisle[a];
      for (let side=0; side<2; side++) {
        const isEast = side===1;
        const xBase = a * rackAndAisleWidth + (isEast ? totalRackDepth + constants.aisleWidth : 0);
        for (let l=0;l<levels;l++) {
          for (let m=0;m<uiConfig.modules_per_aisle;m++) {
            for (let dpt=0; dpt<uiConfig.storage_depth; dpt++) {
              for (let s=0; s<uiConfig.locations_per_module; s++) {
                if (this.matchMissing(a,l,m,dpt,s,missingLocations)) {
                  // Optional visualization of missing locations
                  if (uiConfig.showMissingIndicators !== false) {
                    const displayDepthIndexMissing = isEast ? dpt : uiConfig.storage_depth - 1 - dpt;
                    const xM = xBase + (displayDepthIndexMissing * constants.locationDepth) + (constants.locationDepth/2);
                    const yM = (l*constants.levelHeight)+(constants.levelHeight/2);
                    const zM = (m*uiConfig.locations_per_module*constants.locationLength) + (s*constants.locationLength)+(constants.locationLength/2);
                    pushInstance(`Missing_${side}`, new THREE.Vector3(xM,yM,zM), { aisle:a, level:l, module:m, depth:dpt, position:s, type:'Missing', status:'Unavailable' });
                  }
                  continue;
                }
                const locType = this.matchLocationType(a,l,m,dpt,s,locationTypes) || 'Storage';
                const displayDepthIndex = isEast ? dpt : uiConfig.storage_depth - 1 - dpt;
                const x = xBase + (displayDepthIndex * constants.locationDepth) + (constants.locationDepth/2);
                const y = (l*constants.levelHeight)+(constants.levelHeight/2);
                const z = (m*uiConfig.locations_per_module*constants.locationLength) + (s*constants.locationLength)+(constants.locationLength/2);
                pushInstance(`${locType}_${side}`, new THREE.Vector3(x,y,z), { aisle:a, level:l, module:m, depth:dpt, position:s, type:locType });
              }
            }
          }
        }
      }
    }

    // --- Frame skeleton (simplified instanced frame bars per module level & side) ---
    (() => {
      const frameGeometry = new THREE.BoxGeometry(totalRackDepth, 0.08, moduleLength);
      // Count frames
      let frameCount = 0;
      for (let a=0;a<uiConfig.aisles;a++) {
        const levels = uiConfig.levels_per_aisle[a];
        frameCount += levels * uiConfig.modules_per_aisle * 2; // two sides
      }
      if (frameCount === 0) return;
      const frameMaterial = this.textureAtlas ? (this.textureAtlas.getMaterial('frame_steel') || this.textureAtlas.getMaterial('frame_aluminum')) : new THREE.MeshStandardMaterial({ color: 0x888888, metalness:0.6, roughness:0.4 });
      const frameMesh = new THREE.InstancedMesh(frameGeometry, frameMaterial, frameCount);
      const mtx = new THREE.Matrix4();
      let idx = 0;
      for (let a=0;a<uiConfig.aisles;a++) {
        const levels = uiConfig.levels_per_aisle[a];
        for (let side=0; side<2; side++) {
          const isEast = side===1;
            const xBase = a * rackAndAisleWidth + (isEast ? totalRackDepth + constants.aisleWidth : 0);
          for (let l=0;l<levels;l++) {
            for (let m=0;m<uiConfig.modules_per_aisle;m++) {
              const x = xBase + totalRackDepth / 2;
              const y = l * constants.levelHeight;
              const z = (m * moduleLength) + (moduleLength/2);
              mtx.setPosition(x,y,z);
              frameMesh.setMatrixAt(idx++, mtx);
            }
          }
        }
      }
      frameMesh.instanceMatrix.needsUpdate = true;
      frameMesh.userData.isInstancedFrame = true;
      group.add(frameMesh);
    })();

    // Build instanced meshes
    const tmpMatrix = new THREE.Matrix4();
    let reused = 0; let rebuilt = 0;
  buckets.forEach((bucket, key) => {
      // signature: count + rolling hash of positions + type distribution
      const typeCounts = bucket.data.reduce((acc,d)=>{acc[d.type]=(acc[d.type]||0)+1; return acc;},{});
      const typeSig = Object.entries(typeCounts).sort().map(([t,c])=>`${t.slice(0,3)}:${c}`).join('|');
      let hash = 0;
      for (let i=0;i<bucket.positions.length;i++) {
        const p = bucket.positions[i];
        // simple integer fold hash
        hash = (hash * 31 + ((p.x*10)|0)) | 0;
        hash = (hash * 31 + ((p.y*10)|0)) | 0;
        hash = (hash * 31 + ((p.z*10)|0)) | 0;
      }
      bucket.signature = `${bucket.positions.length}#${hash}#${typeSig}`;
      const prev = prevMeshesByKey.get(key);
      if (canIncrement && !force && prev && prev.userData && prev.userData.signature === bucket.signature) {
        // reuse existing mesh
        reused++;
        const clone = prev.clone();
        clone.userData.isInstancedRack = true;
        group.add(clone); // shallow clone to detach from old group
        return;
      }
      const mat = this.materialForType(bucket.data[0].type);
      const mesh = new THREE.InstancedMesh(locationGeometry, mat, bucket.positions.length);
      for (let i=0;i<bucket.positions.length;i++) {
        // IMPORTANT: Matrix4.setPosition in three.js r128 expects numeric x,y,z (not a Vector3 object)
        // Passing the Vector3 directly resulted in NaN translation components, making cubes invisible.
        const p = bucket.positions[i];
        tmpMatrix.setPosition(p.x, p.y, p.z);
        mesh.setMatrixAt(i,tmpMatrix);
        if (!mesh.userData.locations) mesh.userData.locations = [];
        mesh.userData.locations[i] = bucket.data[i];
      }
      mesh.instanceMatrix.needsUpdate = true;
  mesh.userData.groupKey = key;
      mesh.userData.signature = bucket.signature;
  mesh.userData.isInstancedRack = true;
      group.add(mesh);
      rebuilt++;
    });
    if (canIncrement) {
      // Incremental update complete
      const bucketCount = buckets.size; const totalInstances = Array.from(buckets.values()).reduce((acc,b)=>acc+b.positions.length,0);
  this._lastStats = { mode: 'instanced', reused, rebuilt, bucketCount, totalInstances };
    } else {
  const bucketCount = buckets.size; const totalInstances = Array.from(buckets.values()).reduce((acc,b)=>acc+b.positions.length,0);
  this._lastStats = { mode: 'instanced', reused: 0, rebuilt: bucketCount, bucketCount, totalInstances };
    }
    // Fire a lightweight custom event for any UI listeners (guard for tests/headless)
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      try {
        window.dispatchEvent(new CustomEvent('rackbuilder:stats', { detail: this._lastStats }));
  } catch { /* optional */ }
    }
    return group;
  }

  materialForType(type) {
    // Use texture atlas if available else fallback simple material
    if (this.textureAtlas) {
      const safe = type.toLowerCase().replace(/\s+/g,'_');
      if (type === 'Missing') {
        const missingMat = this.textureAtlas.getMaterial('missing_location');
        if (missingMat) return missingMat.clone();
        // fallback translucent red
        return new THREE.MeshStandardMaterial({ color: 0xff4444, transparent:true, opacity:0.25 });
      }
      const atlasMat = this.textureAtlas.getMaterial(`storage_${safe}`) || this.textureAtlas.getMaterial('storage_default');
      if (atlasMat && atlasMat.userData && atlasMat.userData.atlasName !== 'storage_default') {
        return atlasMat.clone();
      }
      // If this is a custom type without dedicated atlas material, derive color from theme helper
      try {
        const { color, emissive, emissiveIntensity } = getLocationTypeColor(type, 0);
        const base = (atlasMat || this.textureAtlas.getMaterial('storage_default')).clone();
        if (color !== undefined) base.color = new THREE.Color(color);
        if (emissive !== undefined) base.emissive = new THREE.Color(emissive);
        if (emissiveIntensity !== undefined) base.emissiveIntensity = emissiveIntensity;
        base.userData.derivedForType = type;
        return base;
      } catch {
        return (atlasMat || this.textureAtlas.getMaterial('storage_default')).clone();
      }
    }
    return new THREE.MeshStandardMaterial({ color: 0x6e9075 });
  }

  /**
   * Returns statistics from the last build (instanced or regular)
   * @returns {{mode:string,reused:number,rebuilt:number}|null}
   */
  getLastBuildStats() { return this._lastStats || null; }

  matchMissing(a,l,m,d,s,missing) {
    // Treat null the same as undefined (wildcard) for convenience with JSON configs
    return missing.some(r => (
      ((r.aisle == null) || r.aisle === a || (Array.isArray(r.aisle)&&r.aisle.includes(a))) &&
      ((r.level == null) || r.level === l || (Array.isArray(r.level)&&r.level.includes(l))) &&
      ((r.module == null) || r.module === m || (Array.isArray(r.module)&&r.module.includes(m))) &&
      ((r.depth == null) || r.depth === d || (Array.isArray(r.depth)&&r.depth.includes(d))) &&
      ((r.position == null) || r.position === s || (Array.isArray(r.position)&&r.position.includes(s)))
    ));
  }

  matchLocationType(a,l,m,d,s,locationTypes) {
    if (!Array.isArray(locationTypes)) return null;
    const found = locationTypes.find(t => (
      ((t.aisle==null) || t.aisle===a || (Array.isArray(t.aisle)&&t.aisle.includes(a))) &&
      ((t.level==null) || t.level===l || (Array.isArray(t.level)&&t.level.includes(l))) &&
      ((t.module==null) || t.module===m || (Array.isArray(t.module)&&t.module.includes(m))) &&
      ((t.depth==null) || t.depth===d || (Array.isArray(t.depth)&&t.depth.includes(d))) &&
      ((t.position==null) || t.position===s || (Array.isArray(t.position)&&t.position.includes(s)))
    ));
    return found ? (found.type || found.id || 'Storage') : null;
  }
}
