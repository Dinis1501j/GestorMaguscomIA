import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAnalysis} from '../assets/ai-contract.js';
import {refinePhotoColumns} from '../assets/ai-crops.js';
const categories=[{id:'figuras'}];
const valid=()=>({products:[{name:'Dragão',category:'figuras',price:'??€',photos:[{x:0,y:0,width:0.3,height:0.8},{x:0.3,y:0,width:0.3,height:0.8},{x:0.6,y:0,width:0.4,height:0.8}]}]});
test('preserves three photos of one product and unknown price',()=>{const result=validateAnalysis(valid(),categories);assert.equal(result.products.length,1);assert.equal(result.products[0].photos.length,3);assert.equal(result.products[0].price,'??€');});
test('rejects invented categories, invalid rectangles and empty results',()=>{const data=valid();data.products[0].category='inventada';assert.throws(()=>validateAnalysis(data,categories));for(const crop of [{x:-1},{width:2},{height:NaN},{width:0}]){const data=valid();Object.assign(data.products[0].photos[0],crop);assert.throws(()=>validateAnalysis(data,categories));}assert.throws(()=>validateAnalysis({products:[]},categories));});
test('snaps three photos to light gutters and preserves layouts without confident edges',()=>{const width=120,height=70,data=new Uint8ClampedArray(width*height*4).fill(255);for(const left of [2,42,82])for(let y=10;y<65;y++)for(let x=left;x<left+36;x++){const i=(y*width+x)*4;data[i]=data[i+1]=data[i+2]=50;}const photos=[0,0.25,0.5].map(x=>({x,y:0.15,width:0.25,height:0.6}));const result=refinePhotoColumns({data,width,height},photos);assert.equal(result.length,3);assert.ok(Math.abs(result[2].x-82/120)<0.001);assert.equal(result[0].height,55/70);data.fill(0);assert.equal(refinePhotoColumns({data,width,height},photos),photos);});
