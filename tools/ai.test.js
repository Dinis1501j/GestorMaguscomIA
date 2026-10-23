import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAnalysis} from '../assets/ai-contract.js';
const categories=[{id:'figuras'}];
const valid=()=>({products:[{name:'Dragão',category:'figuras',price:'??€',photos:[{x:0,y:0,width:0.3,height:0.8},{x:0.3,y:0,width:0.3,height:0.8},{x:0.6,y:0,width:0.4,height:0.8}]}]});
test('preserves three photos of one product and unknown price',()=>{const result=validateAnalysis(valid(),categories);assert.equal(result.products.length,1);assert.equal(result.products[0].photos.length,3);assert.equal(result.products[0].price,'??€');});
test('rejects invented categories, invalid rectangles and empty results',()=>{const data=valid();data.products[0].category='inventada';assert.throws(()=>validateAnalysis(data,categories));for(const crop of [{x:-1},{width:2},{height:NaN},{width:0}]){const data=valid();Object.assign(data.products[0].photos[0],crop);assert.throws(()=>validateAnalysis(data,categories));}assert.throws(()=>validateAnalysis({products:[]},categories));});
