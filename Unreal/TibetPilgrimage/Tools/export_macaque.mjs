// Export the web game's actual rhesus rig one articulated segment at a time.
// glTF local +X is the animal's forward direction after Unreal import.
import * as THREE from 'three';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { CONFIG } from '../../../src/config.js';
import { createMonkeys } from '../../../src/gameplay/monkeys.js';

const output = new URL('../Assets/Courtyard/', import.meta.url);
const checking = process.argv.includes('--check');
if (!checking) await mkdir(output, { recursive: true });
const {parts} = createMonkeys({
  THREE, config: CONFIG, scene: new THREE.Scene(), state: {time:{}},
  bus: {on(){},emit(){}}, interactables: []
}).monkeys[0];
parts.root.position.set(0,0,0);
parts.root.rotation.set(0,0,0);
parts.root.updateMatrixWorld(true);
const segments = {
  MacaqueBody: parts.body, MacaqueHead: parts.headPivot, MacaqueArm: parts.leftArm,
  MacaqueLeg: parts.leftLeg, MacaqueTail: parts.tailBase, MacaqueTailTip: parts.tailTip,
  OfferingBanana: parts.heldBanana,
};
const pivots = new Set(Object.values(parts));
for (const [name, pivot] of Object.entries(segments)) {
  const chunks = [], views = [], accessors = [], materials = [], primitives = [];
  let bytes = 0;
  function buffer(array, target, type, componentType, count, bounds = {}) {
    const data = Buffer.from(array.buffer, array.byteOffset, array.byteLength);
    views.push({buffer:0, byteOffset:bytes, byteLength:data.length, target});
    chunks.push(data); bytes += data.length;
    const pad = (4-bytes%4)%4;
    if (pad) { chunks.push(Buffer.alloc(pad)); bytes += pad; }
    accessors.push({bufferView:views.length-1,count,type,componentType,...bounds});
    return accessors.length-1;
  }
  const inv = pivot.matrixWorld.clone().invert();
  function visit(obj) {
    if (obj !== pivot && pivots.has(obj)) return;
    if (obj.isMesh) {
      const geom = obj.geometry.clone().applyMatrix4(inv.clone().multiply(obj.matrixWorld));
      geom.rotateY(-Math.PI/2); geom.computeBoundingBox();
      const pos=geom.getAttribute('position'), nor=geom.getAttribute('normal');
      const position=buffer(pos.array,34962,'VEC3',5126,pos.count,{
        min:geom.boundingBox.min.toArray(),max:geom.boundingBox.max.toArray()});
      const normal=buffer(nor.array,34962,'VEC3',5126,nor.count);
      const idx=buffer(new Uint16Array(geom.index.array),34963,'SCALAR',5123,geom.index.count);
      const hex=obj.material.color.getHexString();
      let material=materials.findIndex(m=>m.name==='Paint_'+hex);
      if (material<0) {
        material=materials.length;
        materials.push({name:'Paint_'+hex,pbrMetallicRoughness:{
          baseColorFactor:[...obj.material.color.toArray(),1],
          metallicFactor:obj.material.metalness,roughnessFactor:obj.material.roughness}});
      }
      primitives.push({attributes:{POSITION:position,NORMAL:normal},indices:idx,material});
    }
    for (const child of obj.children) visit(child);
  }
  visit(pivot);
  const manifest={asset:{version:'2.0',generator:'stupa-game rhesus rig'},buffers:[{byteLength:bytes}],
    bufferViews:views, accessors, materials, meshes:[{name,primitives}],nodes:[{mesh:0,name}],scenes:[{nodes:[0]}],scene:0};
  const json=Buffer.from(JSON.stringify(manifest)), jsonLen=(json.length+3)&~3;
  const header=Buffer.alloc(20), binaryHeader=Buffer.alloc(8);
  header.write('glTF'); header.writeUInt32LE(2,4); header.writeUInt32LE(28+jsonLen+bytes,8);
  header.writeUInt32LE(jsonLen,12); header.write('JSON',16);
  binaryHeader.writeUInt32LE(bytes); binaryHeader.writeUInt32LE(0x004e4942,4);
  const dest=new URL(name+'.glb',output);
  const result=Buffer.concat([header,json,Buffer.alloc(jsonLen-json.length,32),binaryHeader,...chunks]);
  if (checking) {
    if (!result.equals(await readFile(dest))) throw new Error('Web macaque geometry changed: '+name);
  } else await writeFile(dest,result);
}
