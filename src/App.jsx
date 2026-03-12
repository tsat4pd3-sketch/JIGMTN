import { useState, useEffect, useCallback } from "react";
import JIG_DIAGRAMS from "./diagrams.js";
import { loadRecords, createRecord, updateRecord, deleteRecord, checkAuth } from "./db.js";
/* ============================================================
   JIG DATA DEFINITIONS
   ============================================================ */
const mkLP_XY = (items) => ({ id:'lp', title:'Locate Pin (Ø -0.20) — Vernier X/Y', type:'locatepin_xy', items });
const mkLP_S  = (items) => ({ id:'lp', title:'Locate Pin (Ø -0.20) — Vernier', type:'locatepin_simple', items });
const mkSD = (n) => ({ id:'sd', title:'Support Datum — Feeler Gauge < 0.30 mm', type:'feeler', items: Array.from({length:n},(_,i)=>({id:`SD${i+1}`,label:`SD ${i+1}`})) });
const mkAC = (n) => ({ id:'ac', title:'Air Clamp + Reed Switch', type:'checklist', items: Array.from({length:n},(_,i)=>({id:`AC${i+1}`,label:`Air Clamp ${i+1} : AC ${i+1}`})) });
const mkPS = (n,extra=[]) => ({ id:'ps', title:'Proximity / Photo Sensor', type:'checklist', items:[...Array.from({length:n},(_,i)=>({id:`PS${i+1}`,label:`Proximity Sensor ${i+1} : PS${i+1}`})),...extra] });
const mkSV = () => ({ id:'sv', title:'Solenoid Valve', type:'checklist', items:[{id:'SV1',label:'Solenoid Valve'}] });
const mkSU = () => ({ id:'su', title:'Service Units (SU)', type:'su', items:[{id:'SU1',label:'SU'}] });
const mkBolt= (t='normal') => ({ id:'bolt', title:t==='uni'?'Bolt, Nut — Unipaint':t==='grip'?'Bolt, Nut — Unipaint + Robot':'Bolt, Nut, Knock Pin', type:t, items:[{id:'BOLT',label:'Bolt / Nut / Knock Pin'}] });
const mkSC = () => ({ id:'sc', title:'Switch Control', type:'checklist', items:[{id:'SC1',label:'Switch Control'}] });

const lp01 = [...Array.from({length:3},(_,i)=>({id:`LP${i+1}`,nom:25.40,max:25.40,min:25.20})),...Array.from({length:9},(_,i)=>({id:`LP${i+4}`,nom:25.40,max:25.40,min:23.90})),...Array.from({length:9},(_,i)=>({id:`LP${i+13}`,nom:25.50,max:25.50,min:25.30})),...Array.from({length:9},(_,i)=>({id:`LP${i+22}`,nom:19.50,max:19.50,min:19.30})),...Array.from({length:3},(_,i)=>({id:`LP${i+31}`,nom:25.40,max:25.40,min:25.20})),...Array.from({length:9},(_,i)=>({id:`LP${i+34}`,nom:25.40,max:25.40,min:23.90}))];
const lp03 = [...Array.from({length:7},(_,i)=>({id:`LP${i+1}`,nom:11.90,max:11.90,min:11.70})),...Array.from({length:7},(_,i)=>({id:`LP${i+8}`,nom:9.90,max:9.90,min:9.70})),...Array.from({length:7},(_,i)=>({id:`LP${i+15}`,nom:11.90,max:11.90,min:11.70})),...Array.from({length:7},(_,i)=>({id:`LP${i+22}`,nom:9.90,max:9.90,min:9.70})),...Array.from({length:7},(_,i)=>({id:`LP${i+29}`,nom:11.90,max:11.90,min:11.70})),...Array.from({length:7},(_,i)=>({id:`LP${i+36}`,nom:9.90,max:9.90,min:9.70}))];
const lp05 = Array.from({length:35},(_,i)=>({id:`LP${i+1}`,nom:7.40,max:7.40,min:7.20}));
const lp07 = [{id:'LP1',nom:18.90,max:18.90,min:18.70},{id:'LP2',nom:11.90,max:11.90,min:11.70},{id:'LP3',nom:11.90,max:11.90,min:11.70},{id:'LP4',nom:15.90,max:15.90,min:15.70},{id:'LP5',nom:9.90,max:9.90,min:9.70},{id:'LP6',nom:18.90,max:18.90,min:18.70}];
const lp11 = [{id:'LP1',nom:18.90,max:18.90,min:18.70},{id:'LP2',nom:7.90,max:7.90,min:7.70},{id:'LP3',nom:5.90,max:5.90,min:5.70},{id:'LP4',nom:7.90,max:7.90,min:7.70},{id:'LP5',nom:9.90,max:9.90,min:9.70},{id:'LP6',nom:7.90,max:7.90,min:7.70},{id:'LP7',nom:7.90,max:7.90,min:7.70},{id:'LP8',nom:7.90,max:7.90,min:7.70},{id:'LP9',nom:18.90,max:18.90,min:18.70}];
const lp14 = Array.from({length:42},(_,i)=>({id:`LP${i+1}`,nom:i%2===0?9.50:6.30,max:i%2===0?9.50:6.30,min:i%2===0?9.30:6.10}));

const JIG_LIST = [
  {id:'JHYD06-01',name:'JIG LOAD TUBE LH.',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_S(lp01),mkAC(1),mkPS(35),mkSV(),mkSU(),mkBolt()]},
  {id:'JHYD06-02',name:'JIG CENTERING TUBE #01',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY([{id:'LP1',nom:13.90,max:13.90,min:13.70}]),mkSD(3),mkAC(3),mkPS(5),mkSV(),mkSU(),mkBolt()]},
  {id:'JHYD06-03',name:'JIG SUPPORT BRKT 025 A',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_S(lp03),mkPS(21),mkAC(3),mkSV(),mkSC(),mkBolt('uni')]},
  {id:'JHYD06-04',name:'JIG SUPPORT BRKT 025 B',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_S(lp03),mkPS(21),mkAC(3),mkSV(),mkSC(),mkBolt('uni')]},
  {id:'JHYD06-05',name:'JIG SUPPORT BRKT D04 A',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_S(lp05),mkPS(20),mkAC(3),mkSV(),mkSC(),mkBolt('uni')]},
  {id:'JHYD06-06',name:'JIG SUPPORT BRKT D04 B',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_S(lp05),mkPS(20),mkAC(3),mkSV(),mkSC(),mkBolt('uni')]},
  {id:'JHYD06-07',name:'Sub Arc Welding #A',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY(lp07),mkSD(5),mkAC(9),mkPS(3),mkSV(),mkBolt()]},
  {id:'JHYD06-08',name:'Sub Arc Welding #B',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY(lp07),mkSD(5),mkAC(9),mkPS(3),mkSV(),mkBolt()]},
  {id:'JHYD06-09',name:'MAIN CONVEYOR #1',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkAC(2),mkPS(4,[{id:'PHS1',label:'Photo Sensor PHS1'},{id:'PHS2',label:'Photo Sensor PHS2'}]),mkSV(),mkBolt()]},
  {id:'JHYD06-10',name:'MAIN CONVEYOR #2',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkAC(2),mkPS(4),mkSV(),mkBolt()]},
  {id:'JHYD06-11',name:'Main Arc Welding #A',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY(lp11),mkSD(6),mkAC(11),mkPS(11,[{id:'PHS1',label:'Photo Sensor PHS1'}]),mkSV(),mkBolt()]},
  {id:'JHYD06-12',name:'Main Arc Welding #B',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY(lp11),mkSD(6),mkAC(11),mkPS(11,[{id:'PHS1',label:'Photo Sensor PHS1'}]),mkSV(),mkBolt()]},
  {id:'JHYD06-13',name:'JIG MARKING TUBE',process:'MARKING TUBE',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY([{id:'LP1',nom:19.00,max:19.00,min:18.80}]),mkSD(3),mkAC(2),mkPS(1,[{id:'PHS1',label:'Photo Sensor PHS1'}]),mkSV(),mkSU(),mkBolt('uni')]},
  {id:'JHYD06-14',name:'JIG SUPPORT D21/049 #A',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_S(lp14),mkPS(42),mkAC(3),mkSV(),mkSC(),mkBolt('uni')]},
  {id:'JHYD06-15',name:'JIG SUPPORT D21/049 #B',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_S(lp14),mkPS(42),mkAC(3),mkSV(),mkSC(),mkBolt('uni')]},
  {id:'JHYD06-16',name:'MAIN CHECKING & CONVEYOR',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkPS(4),mkBolt()]},
  {id:'JHYD06-17',name:'JIG SUB ARC FENDER #A',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'RB3B-16E061-BA',sections:[mkLP_XY([{id:'LP1',nom:7.90,max:7.90,min:7.70},{id:'LP2',nom:7.90,max:7.90,min:7.70},{id:'LP3',nom:7.90,max:7.90,min:7.70}]),mkSD(3),mkAC(6),mkPS(2),mkSV(),mkSU(),mkBolt()]},
  {id:'JHYD06-18',name:'JIG SUB ARC FENDER #B',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'RB3B-16E061-BA',sections:[mkLP_XY([{id:'LP1',nom:7.90,max:7.90,min:7.70},{id:'LP2',nom:7.90,max:7.90,min:7.70},{id:'LP3',nom:7.90,max:7.90,min:7.70}]),mkSD(3),mkAC(6),mkPS(2),mkSV(),mkSU(),mkBolt()]},
  {id:'JHYD06-19',name:"JIG SUB ASS'Y ARC WELDING #A",process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'RB3B-16E061-BA',sections:[mkLP_XY([{id:'LP1',nom:18.90,max:18.90,min:18.70},{id:'LP2',nom:5.90,max:5.90,min:5.70},{id:'LP3',nom:7.90,max:7.90,min:7.70},{id:'LP4',nom:18.90,max:18.90,min:18.70}]),mkSD(4),mkAC(6),mkPS(3),mkSV(),mkSU(),mkBolt()]},
  {id:'JHYD06-20',name:"JIG SUB ASS'Y ARC WELDING #B",process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'RB3B-16E061-BA',sections:[mkLP_XY([{id:'LP1',nom:18.90,max:18.90,min:18.70},{id:'LP2',nom:5.90,max:5.90,min:5.70},{id:'LP3',nom:7.90,max:7.90,min:7.70},{id:'LP4',nom:18.90,max:18.90,min:18.70}]),mkSD(4),mkAC(6),mkPS(3),mkSV(),mkSU(),mkBolt()]},
  {id:'GPHYD06-01',name:'GRIPPER TRANSFER #01',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY([{id:'LP1',nom:18.90,max:18.90,min:18.70},{id:'LP2',nom:15.80,max:15.80,min:15.60}]),mkSD(4),mkAC(2),mkPS(2),mkSV(),mkBolt('grip')]},
  {id:'GPHYD06-02',name:'GRIPPER TRANSFER #02',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY([{id:'LP1',nom:9.90,max:9.90,min:9.70},{id:'LP2',nom:15.90,max:15.90,min:15.70},{id:'LP3',nom:15.90,max:15.90,min:15.70}]),mkSD(5),mkAC(5),mkPS(4),mkSV(),mkBolt('grip')]},
  {id:'GPHYD06-03',name:'GRIPPER TRANSFER #03',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY([{id:'LP1',nom:16.90,max:16.90,min:16.70},{id:'LP2',nom:7.90,max:7.90,min:7.70}]),mkSD(2),mkAC(1),mkPS(1),mkSV(),mkBolt('grip')]},
  {id:'GPHYD06-04',name:'GRIPPER TRANSFER #04',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY([{id:'LP1',nom:15.90,max:15.90,min:15.70},{id:'LP2',nom:15.90,max:15.90,min:15.70}]),mkSD(6),mkAC(4),mkPS(2),mkSV(),mkBolt('grip')]},
  {id:'GPHYD06-05',name:'GRIPPER TRANSFER #05',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY([{id:'LP1',nom:18.90,max:18.90,min:18.70},{id:'LP2',nom:15.80,max:15.80,min:15.60}]),mkSD(4),mkAC(2),mkPS(2),mkSV(),mkBolt('grip')]},
  {id:'GPHYD06-06',name:'GRIPPER TRANSFER #06',process:'ASSEMBLY',partName:'REINF ASY FRT FNDR INR BDY LH',model:'P703',partNo:'MB3B-16E061-C_113',sections:[mkLP_XY([{id:'LP1',nom:5.90,max:5.90,min:5.70},{id:'LP2',nom:7.90,max:7.90,min:7.70},{id:'LP3',nom:9.90,max:9.90,min:9.70}]),mkSD(2),mkAC(3),mkPS(2),mkSV(),mkBolt('grip')]},
];

/* ============================================================ HELPERS ============================================================ */
const today = () => new Date().toISOString().slice(0,10);
const fmtDate = d => d ? new Date(d+'T00:00:00').toLocaleDateString('th-TH',{day:'2-digit',month:'2-digit',year:'numeric'}) : '-';
const judgeLP = (val,max,min) => { const n=parseFloat(val); if(isNaN(n)) return null; return (n>=min&&n<=max)?'OK':'NG'; };
const judgeSD = val => { const n=parseFloat(val); if(isNaN(n)) return null; return n<0.30?'OK':'NG'; };

/* ============================================================ PDF EXPORT — uses window.print via hidden iframe ============================================================ */
const buildPrintHTML = (record, jig) => {
  const data = record.data||{};
  const remarks = record.remarks||{};

  const cell = (content, extra='') =>
    `<td style="border:1px solid #aaa;padding:3px 5px;text-align:center;font-size:9pt;${extra}">${content??''}</td>`;
  const th = (content, extra='') =>
    `<th style="border:1px solid #666;padding:3px 5px;text-align:center;font-size:8.5pt;background:#d0daea;${extra}">${content}</th>`;

  const diagImgs = (JIG_DIAGRAMS[jig.id]||[]).map(src =>
    `<img src="${src}" style="max-width:100%;max-height:200px;object-fit:contain;display:block;margin:4px auto;" />`
  ).join('');

  let sectionsHTML = '';

  jig.sections.forEach(sec => {
    sectionsHTML += `<div style="margin-bottom:10px;break-inside:avoid;">
      <div style="background:#1e3a5f;color:#fff;padding:5px 8px;font-size:9pt;font-weight:bold;border-radius:3px 3px 0 0;">
        ${sec.title}
      </div>`;

    if (sec.type === 'locatepin_simple') {
      const half = Math.ceil(sec.items.length/2);
      const left = sec.items.slice(0, half), right = sec.items.slice(half);
      sectionsHTML += `<table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
        <thead><tr>
          ${th('No.')}${th('Locate Pin')}${th('Nom.(mm)')}${th('Max')}${th('Min')}${th('Actual')}${th('Judg.')}${th('Action (NG)')}
          ${th('No.')}${th('Locate Pin')}${th('Nom.(mm)')}${th('Max')}${th('Min')}${th('Actual')}${th('Judg.')}${th('Action (NG)')}
        </tr></thead><tbody>`;
      for (let i=0; i<left.length; i++) {
        const l = left[i], r = right[i];
        const kl=`lp_${l.id}`, vl=data[kl], jl=judgeLP(vl,l.max,l.min);
        const kr=r?`lp_${r.id}`:'', vr=r?data[kr]:'', jr=r?judgeLP(vr,r.max,r.min):'';
        const ngStyle='color:red;font-weight:bold;', okStyle='color:green;font-weight:bold;';
        sectionsHTML += `<tr>
          ${cell(i+1)}${cell(l.id,'text-align:left;')}${cell(l.nom)}${cell(l.max)}${cell(l.min)}
          ${cell(vl||'___','font-weight:bold;')}
          ${cell(jl||'', jl==='NG'?ngStyle:jl==='OK'?okStyle:'')}
          ${cell(jl==='NG'?(remarks[kl]||''):'','font-size:8pt;color:#555;')}
          ${r?cell(i+half+1):'<td style="border:none;"></td>'}
          ${r?cell(r.id,'text-align:left;'):'<td style="border:none;"></td>'}
          ${r?cell(r.nom):'<td style="border:none;"></td>'}
          ${r?cell(r.max):'<td style="border:none;"></td>'}
          ${r?cell(r.min):'<td style="border:none;"></td>'}
          ${r?cell(vr||'___','font-weight:bold;'):'<td style="border:none;"></td>'}
          ${r?cell(jr||'',jr==='NG'?ngStyle:jr==='OK'?okStyle:''):'<td style="border:none;"></td>'}
          ${r?cell(jr==='NG'?(remarks[kr]||''):'','font-size:8pt;color:#555;'):'<td style="border:none;"></td>'}
        </tr>`;
      }
      sectionsHTML += `</tbody></table>`;

    } else if (sec.type === 'locatepin_xy') {
      sectionsHTML += `<table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
        <thead><tr>
          ${th('No.')}${th('Locate Pin')}${th('Axis')}${th('Nom.')}${th('Max')}${th('Min')}${th('Check 1')}${th('Check 2')}${th('Check 3')}${th('Avg')}${th('Judg.')}${th('Action (NG)')}
        </tr></thead><tbody>`;
      sec.items.forEach((item,ri) => {
        ['X','Y'].forEach((ax,ai) => {
          const key=`lp_${item.id}_${ax}`;
          const v1=data[`${key}_1`]||'', v2=data[`${key}_2`]||'', v3=data[`${key}_3`]||'';
          const nums=[v1,v2,v3].map(parseFloat).filter(n=>!isNaN(n));
          const avg=nums.length?(nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(2):'';
          const j=avg?judgeLP(avg,item.max,item.min):'';
          const ngS='color:red;font-weight:bold;', okS='color:green;font-weight:bold;';
          sectionsHTML += `<tr>
            ${ai===0?`<td rowspan="2" style="border:1px solid #aaa;text-align:center;font-size:9pt;">${ri+1}</td>`:''}
            ${ai===0?`<td rowspan="2" style="border:1px solid #aaa;text-align:left;font-size:9pt;padding:2px 5px;font-weight:bold;">${item.id}</td>`:''}
            ${cell(ax,'font-weight:bold;color:#1e3a5f;')}
            ${ai===0?`<td rowspan="2" style="border:1px solid #aaa;text-align:center;font-size:9pt;">${item.nom}</td>`:''}
            ${ai===0?`<td rowspan="2" style="border:1px solid #aaa;text-align:center;font-size:9pt;">${item.max}</td>`:''}
            ${ai===0?`<td rowspan="2" style="border:1px solid #aaa;text-align:center;font-size:9pt;">${item.min}</td>`:''}
            ${cell(v1||'___','font-weight:bold;')}${cell(v2||'___','font-weight:bold;')}${cell(v3||'___','font-weight:bold;')}
            ${cell(avg||'—')}
            ${cell(j||'',j==='NG'?ngS:j==='OK'?okS:'')}
            ${cell(j==='NG'?(remarks[`lp_${item.id}_remark`]||''):'','font-size:8pt;color:#555;')}
          </tr>`;
        });
      });
      sectionsHTML += `</tbody></table>`;

    } else if (sec.type === 'feeler') {
      sectionsHTML += `<table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
        <thead><tr>${th('No.')}${th('Support Datum')}${th('Standard')}${th('Actual (mm)')}${th('Judgment')}${th('Action (NG)')}</tr></thead><tbody>`;
      sec.items.forEach((item,ri) => {
        const k=`sd_${item.id}`, v=data[k], j=judgeSD(v);
        sectionsHTML += `<tr>
          ${cell(ri+1)}${cell(`Support Datum ${ri+1} : ${item.id}`,'text-align:left;')}
          ${cell('< 0.30 mm')}${cell(v||'___','font-weight:bold;')}
          ${cell(j||'',j==='NG'?'color:red;font-weight:bold;':j==='OK'?'color:green;font-weight:bold;':'')}
          ${cell(j==='NG'?(remarks[k]||''):'','font-size:8pt;color:#555;')}
        </tr>`;
      });
      sectionsHTML += `</tbody></table>`;

    } else if (sec.type === 'su') {
      const suItems=['ปริมาณน้ำมันหล่อลื่น','ปริมาณน้ำในกรองดักความชื้น','เช็คการรั่วซึมของอุปกรณ์','อุปกรณ์ไม่แตกหัก'];
      sectionsHTML += `<table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
        <thead><tr>${th('No.')}${th('Service Units Check Point')}${th('Checking')}${th('Result')}</tr></thead><tbody>`;
      suItems.forEach((itm,ri) => {
        const k=`su_SU1_${ri}`, v=data[k]||'';
        sectionsHTML += `<tr>${cell(ri+1)}${cell(itm,'text-align:left;')}${cell(v,v==='OK'?'color:green;font-weight:bold;':v==='NG'?'color:red;font-weight:bold;':'')}${cell(v==='NG'?(remarks[k]||''):'','font-size:8pt;color:#555;')}</tr>`;
      });
      sectionsHTML += `</tbody></table>`;

    } else {
      // checklist
      const stdMap = {ac:'กดชิ้นงานแน่น / ไม่รั่วซึม / Reed Switch ปกติ', ps:'ไม่ชำรุด / ไม่แตกหัก / ไฟสถานะติด', sv:'ทำงานปกติ / ไม่มีลมรั่ว', sc:'สวิตช์ไม่รอยร้าว / แตกหัก / ชำรุด', bolt:'ขันแน่น / ไม่คลายตัว', uni:'เช็ค Unipaint มาร์คตรง', grip:'Unipaint + โบลท์ Robot ไม่หลวม', normal:'ขันแน่น / ไม่คลายตัว'};
      const std = stdMap[sec.id] || stdMap[sec.type] || 'ปกติ';
      sectionsHTML += `<table style="width:100%;border-collapse:collapse;font-size:8.5pt;">
        <thead><tr>${th('No.')}${th('Check Point')}${th('Standard')}${th('Checking')}${th('Action (NG)')}</tr></thead><tbody>`;
      sec.items.forEach((item,ri) => {
        const k=`${sec.id}_${item.id}`, v=data[k]||'';
        sectionsHTML += `<tr style="${v==='NG'?'background:#fff0f0;':''}">
          ${cell(ri+1)}${cell(item.label,'text-align:left;')}${cell(std,'text-align:left;font-size:8pt;color:#444;')}
          ${cell(v,v==='OK'?'color:green;font-weight:bold;':v==='NG'?'color:red;font-weight:bold;':'')}
          ${cell(v==='NG'?(remarks[k]||''):'','font-size:8pt;color:#555;text-align:left;')}
        </tr>`;
      });
      sectionsHTML += `</tbody></table>`;
    }
    sectionsHTML += `</div>`;
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PM JIG — ${jig.id}</title>
<style>
  @page { size: A4 landscape; margin: 10mm 8mm; }
  * { box-sizing: border-box; }
  body { font-family: 'TH Sarabun New', 'Sarabun', Arial, sans-serif; font-size: 9pt; color: #111; margin:0; }
  .header { display:flex; justify-content:space-between; align-items:stretch; border:1.5px solid #333; background:#e8eef8; padding:6px 10px; margin-bottom:6px; border-radius:3px; }
  .header-left { flex:1; }
  .header-left h2 { margin:0; font-size:12pt; color:#1a2a4a; }
  .header-left p { margin:2px 0; font-size:8.5pt; color:#444; }
  .header-center { flex:1.5; text-align:center; }
  .header-center h1 { margin:0; font-size:15pt; font-weight:bold; color:#1a2a4a; }
  .header-right { flex:1; text-align:right; font-size:8pt; color:#555; }
  .sig-box { display:inline-block; border:1px solid #999; width:65px; text-align:center; margin-left:4px; padding:2px 0; font-size:8pt; font-weight:bold; }
  .jig-info { display:grid; grid-template-columns:1fr 1fr 1fr; gap:4px; border:1px solid #aaa; padding:6px 8px; margin-bottom:8px; background:#f5f8ff; font-size:9pt; border-radius:2px; }
  .jig-info span { font-weight:bold; color:#1a2a4a; }
  .result-badge { display:inline-block; padding:3px 14px; border-radius:10px; font-weight:bold; font-size:11pt; }
  .result-ok { background:#d1fae5; color:#065f46; border:2px solid #059669; }
  .result-ng { background:#fee2e2; color:#991b1b; border:2px solid #dc2626; }
  .diagrams { display:flex; gap:8px; margin-bottom:8px; justify-content:center; }
  .diagrams img { max-height:170px; border:1px solid #ccc; border-radius:3px; }
  .code-legend { margin-top:6px; border:1px solid #ccc; background:#f5f5f5; padding:4px 8px; font-size:7.5pt; color:#444; border-radius:2px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="header">
  <div class="header-left">
    <h2>บริษัท ไทยซัมมิท โอโตโมทีฟ จำกัด สาขา 1</h2>
    <p>Thai Summit Automotive Co.,Ltd (Branch 1)</p>
    <p style="font-size:7.5pt;color:#888;">FM-JIG-003  Rev.00  Eff date: 01/07/2020</p>
  </div>
  <div class="header-center">
    <h1>Preventive Maintenance JIG</h1>
    <p style="font-size:8.5pt;margin:2px 0;">00 &nbsp; Initial issue &nbsp; 1/7/2020</p>
  </div>
  <div class="header-right">
    <div><span class="sig-box">ISSUED</span><span class="sig-box">CHECKED</span><span class="sig-box">APPROVED</span></div>
    <div style="margin-top:18px;height:24px;display:flex;gap:4px;justify-content:flex-end;">
      <span class="sig-box" style="height:24px;"> </span>
      <span class="sig-box" style="height:24px;"> </span>
      <span class="sig-box" style="height:24px;"> </span>
    </div>
  </div>
</div>

<div class="jig-info">
  <div><span>Jig No.:</span> ${jig.id}</div>
  <div><span>Jig Name:</span> ${jig.name}</div>
  <div><span>Process:</span> ${jig.process}</div>
  <div><span>Part Name:</span> ${jig.partName}</div>
  <div><span>Model:</span> ${jig.model}</div>
  <div><span>Part No.:</span> ${jig.partNo}</div>
  <div><span>วันที่ PM:</span> ${fmtDate(record.pmDate)}</div>
  <div><span>Shift:</span> ${record.shift}</div>
  <div><span>ผู้ตรวจ:</span> ${record.inspector} &nbsp;&nbsp;
    <span class="result-badge ${record.overallResult==='OK'?'result-ok':'result-ng'}">${record.overallResult||'—'}</span>
  </div>
</div>

${diagImgs ? `<div class="diagrams">${diagImgs}</div>` : ''}

${sectionsHTML}

<div class="code-legend">
  <strong>Code:</strong>&nbsp;
  LP = Locator Pin &nbsp;|&nbsp; SD = Support Datum &nbsp;|&nbsp; AC = Air Clamp &nbsp;|&nbsp; 
  PS = Proximity Sensor &nbsp;|&nbsp; SU = Service Units &nbsp;|&nbsp; SC = Switch Control &nbsp;|&nbsp;
  RS = Reed Switch &nbsp;|&nbsp; <span style="color:green;font-weight:bold;">OK = ปกติ</span> &nbsp;|&nbsp; 
  <span style="color:red;font-weight:bold;">NG = ผิดปกติ</span>
</div>
</body>
</html>`;
};

/* ============================================================ STYLES ============================================================ */
const c = {
  bg:'#0f172a', surface:'#1e293b', border:'#334155', muted:'#64748b', text:'#e2e8f0',
  accent:'#3b82f6', ok:'#22c55e', ng:'#ef4444', warn:'#f59e0b',
  okBg:'rgba(21,128,61,0.15)', ngBg:'rgba(153,27,27,0.15)', okBorder:'#166534', ngBorder:'#7f1d1d'
};
const S = {
  app:{ minHeight:'100vh', background:c.bg, color:c.text, fontFamily:"'IBM Plex Mono', monospace" },
  hdr:{ background:'#0f2040', borderBottom:`2px solid ${c.border}`, padding:'10px 18px', display:'flex', justifyContent:'space-between', alignItems:'center' },
  logo:{ fontSize:12, fontWeight:700, color:c.accent, letterSpacing:2, textTransform:'uppercase' },
  sub:{ fontSize:9, color:c.muted, marginTop:2 },
  wrap:{ maxWidth:1400, margin:'0 auto', padding:'14px 18px' },
  card:{ background:c.surface, border:`1px solid ${c.border}`, borderRadius:6, padding:14, marginBottom:10 },
  cTitle:{ fontSize:10, fontWeight:700, color:c.accent, textTransform:'uppercase', letterSpacing:2, marginBottom:8, borderBottom:`1px solid ${c.border}`, paddingBottom:6 },
  btn:(bg=c.accent)=>({ padding:'6px 14px', border:'none', borderRadius:4, cursor:'pointer', fontSize:10, fontWeight:700, background:bg, color:'#fff', letterSpacing:1 }),
  inp:{ width:'100%', background:'#0a111f', border:`1px solid ${c.border}`, borderRadius:3, padding:'5px 7px', color:c.text, fontSize:10 },
  sel:{ width:'100%', background:'#0a111f', border:`1px solid ${c.border}`, borderRadius:3, padding:'5px 7px', color:c.text, fontSize:10 },
  lbl:{ fontSize:9, color:c.muted, marginBottom:2, display:'block' },
  tag:(v)=>({ display:'inline-block', padding:'2px 8px', borderRadius:3, fontSize:10, fontWeight:700,
    background:v==='OK'?c.okBg:v==='NG'?c.ngBg:'#1e293b',
    color:v==='OK'?c.ok:v==='NG'?c.ng:c.muted,
    border:`1px solid ${v==='OK'?c.okBorder:v==='NG'?c.ngBorder:c.border}` }),
  th:{ background:'#1e3a5f', color:'#93c5fd', padding:'4px 6px', textAlign:'center', border:`1px solid ${c.border}`, fontSize:8.5, fontWeight:700 },
  td:(ng=false)=>({ padding:'3px 6px', border:`1px solid ${ng?c.ngBorder:c.border}`, textAlign:'center', color:ng?c.ng:c.text, fontSize:9.5, background:ng?c.ngBg:'transparent' }),
  secHdr:(ng=false)=>({ background:ng?'#3a1a1a':'#1e3a5f', padding:'7px 12px', fontSize:10, fontWeight:700, color:ng?'#fca5a5':'#93c5fd', letterSpacing:1, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', borderRadius:'4px 4px 0 0' }),
};

/* ---- CheckCell ---- */
const CheckCell = ({val, onChange}) => (
  <div style={{display:'flex',gap:3,justifyContent:'center'}}>
    {['OK','NG','N/A'].map(v=>(
      <button key={v} onClick={()=>onChange(val===v?'':v)}
        style={{padding:'2px 6px',borderRadius:3,border:`1px solid ${v==='OK'?c.okBorder:v==='NG'?c.ngBorder:c.border}`,
          background:val===v?(v==='OK'?'#14532d':v==='NG'?'#450a0a':'#334155'):'transparent',
          color:val===v?(v==='OK'?c.ok:v==='NG'?c.ng:'#cbd5e1'):c.muted,
          fontSize:9,cursor:'pointer',fontWeight:700}}>
        {v}
      </button>
    ))}
  </div>
);

/* ============================================================ MAIN APP ============================================================ */
export default function App() {
  const [screen, setScreen] = useState('home'); // home | form | history
  const [records, setRecords] = useState([]);
  const [selJig, setSelJig]   = useState(null);
  const [editRec, setEditRec] = useState(null);
  const [hFilter, setHFilter] = useState('');
  const [printing, setPrinting] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(''); // 'saving' | 'saved' | 'error'
  const [hasToken, setHasToken] = useState(true);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try {
        const auth = await checkAuth();
        setHasToken(auth.ok);
        const recs = await loadRecords();
        setRecords(recs);
      } catch(e) {
        // fallback to localStorage
        try {
          const local = localStorage.getItem('pm_jig_v3');
          if (local) setRecords(JSON.parse(local));
        } catch(_) {}
      }
      setLoading(false);
    })();
  },[]);

  const save = useCallback(async (recs, record=null, isDelete=false, issueNum=null) => {
    setRecords(recs);
    setSaveStatus('saving');
    try {
      if (isDelete && issueNum) {
        await deleteRecord(issueNum);
      } else if (record) {
        if (record._issueNumber) await updateRecord(record);
        else { const saved = await createRecord(record); recs = recs.map(r=>r.id===saved.id?saved:r); setRecords(recs); }
      }
      localStorage.setItem('pm_jig_v3', JSON.stringify(recs));
      setSaveStatus('saved');
      setTimeout(()=>setSaveStatus(''), 2000);
    } catch(e) {
      localStorage.setItem('pm_jig_v3', JSON.stringify(recs));
      setSaveStatus('error');
      setTimeout(()=>setSaveStatus(''), 4000);
    }
  }, []);

  const openForm = (jig, rec=null) => {
    setSelJig(jig);
    setEditRec(rec ? {...rec} : { id:'REC_'+Date.now(), jigId:jig.id, jigName:jig.name, process:jig.process, inspector:'', pmDate:today(), shift:'A', data:{}, remarks:{}, overallResult:'', createdAt:Date.now() });
    setScreen('form');
  };

  const handleSave = () => {
    let hasNG=false;
    selJig.sections.forEach(sec=>sec.items.forEach(item=>{
      const k=`${sec.id}_${item.id}`;
      if(sec.type==='locatepin_simple'){ if(judgeLP(editRec.data[k],item.max,item.min)==='NG') hasNG=true; }
      else if(sec.type==='feeler'){ if(judgeSD(editRec.data[k])==='NG') hasNG=true; }
      else if(sec.type==='locatepin_xy'){
        ['X','Y'].forEach(ax=>{ const avg=calcAvg(editRec.data,`${sec.id}_${item.id}_${ax}`); if(avg&&judgeLP(avg,item.max,item.min)==='NG') hasNG=true; });
      } else { if(editRec.data[k]==='NG') hasNG=true; }
    }));
    const final = {...editRec, overallResult:hasNG?'NG':'OK', updatedAt:Date.now()};
    const idx = records.findIndex(r=>r.id===final.id);
    const newRecs = idx>=0 ? records.map((r,i)=>i===idx?final:r) : [...records,final]; save(newRecs, final);
    setScreen('home');
  };

  const handlePrint = async (rec) => {
    const jig = JIG_LIST.find(j=>j.id===rec.jigId); if(!jig) return;
    setPrinting(true);
    try {
      const html = buildPrintHTML(rec, jig);
      const win = window.open('','_blank','width=1100,height=800');
      win.document.write(html);
      win.document.close();
      win.onload = () => { win.focus(); win.print(); };
    } catch(e){ alert('Print error: '+e.message); }
    setPrinting(false);
  };

  if(screen==='home')    return <HomeScreen records={records} onOpen={openForm} onHistory={()=>setScreen('history')} loading={loading} saveStatus={saveStatus} hasToken={hasToken} />;
  if(screen==='history') return <HistoryScreen records={records} filter={hFilter} setFilter={setHFilter} onBack={()=>setScreen('home')} onEdit={rec=>{const j=JIG_LIST.find(j=>j.id===rec.jigId);openForm(j,rec);}} onPrint={handlePrint} printing={printing} onDelete={(id,issueNum)=>{ const recs=records.filter(r=>r.id!==id); save(recs, null, true, issueNum); }} />;
  if(screen==='form')    return <FormScreen jig={selJig} record={editRec} setRecord={setEditRec} onSave={handleSave} onBack={()=>setScreen('home')} onPrint={handlePrint} printing={printing} />;
  return null;
}

const calcAvg = (data, key) => {
  const nums=[data[`${key}_1`],data[`${key}_2`],data[`${key}_3`]].map(parseFloat).filter(n=>!isNaN(n));
  return nums.length ? (nums.reduce((a,b)=>a+b,0)/nums.length).toFixed(2) : '';
};

/* ============================================================ HOME ============================================================ */
function HomeScreen({records, onOpen, onHistory, loading, saveStatus, hasToken}) {
  const thisMonth = records.filter(r=>r.pmDate?.slice(0,7)===today().slice(0,7)).length;
  const ngCount   = records.filter(r=>r.overallResult==='NG').length;
  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div><div style={S.logo}>⚙ PM JIG — Thai Summit Automotive</div><div style={S.sub}>Preventive Maintenance JIG System  |  FM-JIG-003 Rev.00  |  {JIG_LIST.length} JIGs</div></div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          {saveStatus==='saving' && <span style={{fontSize:9,color:'#f59e0b'}}>⏳ กำลังบันทึก...</span>}
          {saveStatus==='saved'  && <span style={{fontSize:9,color:'#22c55e'}}>✓ บันทึกแล้ว</span>}
          {saveStatus==='error'  && <span style={{fontSize:9,color:'#ef4444'}}>⚠ offline (บันทึกใน device)</span>}
          {!hasToken && <span style={{fontSize:9,color:'#f59e0b',background:'#422006',padding:'2px 7px',borderRadius:3}}>⚠ Token ไม่ได้ตั้งค่า — ข้อมูลเก็บใน device เท่านั้น</span>}
          <button style={S.btn('#334155')} onClick={onHistory}>📋 ประวัติ PM</button>
        </div>
      </div>
      <div style={S.wrap}>
        {loading && <div style={{textAlign:'center',padding:40,color:'#64748b',fontSize:12}}>⏳ กำลังโหลดข้อมูลจาก GitHub...</div>}
        {!loading && <>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
          {[['PM ทั้งหมด',records.length,'#1e3a5f'],['เดือนนี้',thisMonth,'#1a3a2a'],['NG',ngCount,ngCount>0?'#3a1a1a':'#1e293b']].map(([t,v,bg])=>(
            <div key={t} style={{...S.card,background:bg,textAlign:'center',padding:'14px 10px'}}>
              <div style={{fontSize:10,color:c.muted}}>{t}</div>
              <div style={{fontSize:26,fontWeight:700,color:c.accent}}>{v}</div>
            </div>
          ))}
        </div>
        {[{label:'JHYD06 — Hydraulic JIG',jigs:JIG_LIST.filter(j=>j.id.startsWith('JHYD'))},{label:'GPHYD06 — Gripper Transfer',jigs:JIG_LIST.filter(j=>j.id.startsWith('GP'))}].map(grp=>(
          <div key={grp.label} style={S.card}>
            <div style={S.cTitle}>{grp.label}</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:8}}>
              {grp.jigs.map(jig=>{
                const recs = records.filter(r=>r.jigId===jig.id).sort((a,b)=>b.createdAt-a.createdAt);
                const last = recs[0];
                const isNG = last?.overallResult==='NG';
                const thumbs = (JIG_DIAGRAMS[jig.id]||[]).slice(0,1);
                return (
                  <div key={jig.id} onClick={()=>onOpen(jig)} style={{background:'#0a111f',border:`1px solid ${isNG?c.ngBorder:c.border}`,borderRadius:5,cursor:'pointer',overflow:'hidden',transition:'border 0.2s',display:'flex',flexDirection:'column'}}>
                    {thumbs[0] && <img src={thumbs[0]} alt={jig.id} style={{width:'100%',height:90,objectFit:'cover',objectPosition:'top',borderBottom:`1px solid ${c.border}`,opacity:0.85}} />}
                    <div style={{padding:'8px 10px',flex:1}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                        <div>
                          <div style={{fontSize:10,fontWeight:700,color:c.accent}}>{jig.id}</div>
                          <div style={{fontSize:11,color:c.text,marginTop:1}}>{jig.name}</div>
                          <div style={{fontSize:9,color:c.muted,marginTop:1}}>{jig.process}</div>
                        </div>
                        {last && <span style={S.tag(last.overallResult)}>{last.overallResult}</span>}
                      </div>
                      {last && <div style={{fontSize:8,color:c.muted,marginTop:5}}>📅 {fmtDate(last.pmDate)} &nbsp; 👤 {last.inspector}</div>}
                      {!last && <div style={{fontSize:8,color:'#475569',marginTop:5}}>ยังไม่มีการ PM</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>}
    </div>
  );
}

/* ============================================================ HISTORY ============================================================ */
function HistoryScreen({records, filter, setFilter, onBack, onEdit, onPrint, printing, onDelete}) {
  const list = [...records].filter(r=>(r.jigId+r.jigName+r.inspector+r.pmDate).toLowerCase().includes(filter.toLowerCase())).sort((a,b)=>b.createdAt-a.createdAt);
  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div style={S.logo}>📋 ประวัติ PM</div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input placeholder="ค้นหา JIG / วันที่ / ผู้ตรวจ..." value={filter} onChange={e=>setFilter(e.target.value)} style={{...S.inp,width:240}} />
          <button style={S.btn('#334155')} onClick={onBack}>← กลับ</button>
        </div>
      </div>
      <div style={S.wrap}>
        <div style={S.card}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
            <thead><tr>{['Jig No.','Jig Name','วันที่','Shift','ผู้ตรวจ','ผลลัพธ์','Actions'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
            <tbody>
              {!list.length && <tr><td colSpan={7} style={{...S.td(),padding:20,color:c.muted}}>ไม่พบข้อมูล</td></tr>}
              {list.map(rec=>(
                <tr key={rec.id} style={{background:rec.overallResult==='NG'?c.ngBg:'transparent'}}>
                  <td style={S.td()}><span style={{color:c.accent,fontWeight:700}}>{rec.jigId}</span></td>
                  <td style={{...S.td(),textAlign:'left'}}>{rec.jigName}</td>
                  <td style={S.td()}>{fmtDate(rec.pmDate)}</td>
                  <td style={S.td()}>{rec.shift}</td>
                  <td style={S.td()}>{rec.inspector}</td>
                  <td style={S.td()}><span style={S.tag(rec.overallResult)}>{rec.overallResult}</span></td>
                  <td style={S.td()}>
                    <div style={{display:'flex',gap:3,justifyContent:'center'}}>
                      <button style={{...S.btn('#1d4ed8'),padding:'3px 7px',fontSize:9}} onClick={()=>onEdit(rec)}>✏</button>
                      <button style={{...S.btn('#065f46'),padding:'3px 7px',fontSize:9}} onClick={()=>onPrint(rec)} disabled={printing}>🖨 PDF</button>
                      <button style={{...S.btn('#7f1d1d'),padding:'3px 7px',fontSize:9}} onClick={()=>{if(window.confirm('ลบรายการนี้?'))onDelete(rec.id, rec._issueNumber)}}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ FORM ============================================================ */
function FormScreen({jig, record, setRecord, onSave, onBack, onPrint, printing}) {
  const [open, setOpen] = useState({});
  const upd = (k,v) => setRecord(r=>({...r,data:{...r.data,[k]:v}}));
  const updR= (k,v) => setRecord(r=>({...r,remarks:{...r.remarks,[k]:v}}));
  const diagImgs = JIG_DIAGRAMS[jig.id]||[];

  // Count NG per section
  const secNG = (sec) => {
    let n=0;
    sec.items.forEach(item=>{
      const k=`${sec.id}_${item.id}`;
      if(sec.type==='locatepin_simple' && judgeLP(record.data[k],item.max,item.min)==='NG') n++;
      else if(sec.type==='feeler' && judgeSD(record.data[k])==='NG') n++;
      else if(sec.type==='locatepin_xy'){
        ['X','Y'].forEach(ax=>{ const avg=calcAvg(record.data,`${sec.id}_${item.id}_${ax}`); if(avg&&judgeLP(avg,item.max,item.min)==='NG') n++; });
      } else if(['checklist','uni','grip','normal'].includes(sec.type) && record.data[k]==='NG') n++;
    });
    return n;
  };

  return (
    <div style={S.app}>
      <div style={S.hdr}>
        <div><div style={S.logo}>{jig.id} — {jig.name}</div><div style={S.sub}>{jig.process}  |  {jig.partName}  |  {jig.model}  |  {jig.partNo}</div></div>
        <div style={{display:'flex',gap:8}}>
          <button style={S.btn('#334155')} onClick={onBack}>← ยกเลิก</button>
          <button style={S.btn('#065f46')} onClick={()=>onPrint(record)} disabled={printing}>🖨 {printing?'กำลัง...':'Print / PDF'}</button>
          <button style={S.btn()} onClick={onSave}>💾 บันทึก</button>
        </div>
      </div>
      <div style={S.wrap}>
        {/* Meta */}
        <div style={{...S.card,marginBottom:12}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 2fr 1fr',gap:10,alignItems:'end'}}>
            <div><label style={S.lbl}>วันที่ PM</label><input type="date" style={S.inp} value={record.pmDate} onChange={e=>setRecord(r=>({...r,pmDate:e.target.value}))} /></div>
            <div><label style={S.lbl}>Shift</label><select style={S.sel} value={record.shift} onChange={e=>setRecord(r=>({...r,shift:e.target.value}))}><option>A</option><option>B</option><option>C</option></select></div>
            <div><label style={S.lbl}>ผู้ตรวจสอบ (Inspector)</label><input style={S.inp} value={record.inspector} onChange={e=>setRecord(r=>({...r,inspector:e.target.value}))} placeholder="ชื่อผู้ตรวจ..." /></div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:9,color:c.muted}}>Result:</span>
              <span style={{...S.tag(record.overallResult),fontSize:12,padding:'4px 14px'}}>{record.overallResult||'—'}</span>
            </div>
          </div>
        </div>

        {/* Diagram images */}
        {diagImgs.length>0 && (
          <div style={{...S.card,marginBottom:12}}>
            <div style={S.cTitle}>📐 แผนผัง JIG จากเอกสาร</div>
            <div style={{display:'flex',gap:10,overflowX:'auto',paddingBottom:4}}>
              {diagImgs.map((src,i)=>(
                <img key={i} src={src} alt={`${jig.id} diagram ${i+1}`}
                  style={{height:200,maxWidth:500,objectFit:'contain',border:`1px solid ${c.border}`,borderRadius:4,background:'#fff'}} />
              ))}
            </div>
          </div>
        )}

        {/* Sections */}
        {jig.sections.map(sec=>{
          const ng = secNG(sec);
          const isOpen = open[sec.id]!==false;
          return (
            <div key={sec.id} style={{marginBottom:8}}>
              <div style={S.secHdr(ng>0)} onClick={()=>setOpen(o=>({...o,[sec.id]:!isOpen}))}>
                <span>{sec.title}</span>
                <span style={{display:'flex',gap:6,alignItems:'center'}}>
                  {ng>0 && <span style={S.tag('NG')}>{ng} NG</span>}
                  <span style={{fontSize:13}}>{isOpen?'▲':'▼'}</span>
                </span>
              </div>
              {isOpen && (
                <div style={{background:'#0a111f',border:`1px solid ${c.border}`,borderTop:'none',padding:8,borderRadius:'0 0 4px 4px',overflowX:'auto'}}>
                  {sec.type==='locatepin_simple' && <LPSimple sec={sec} data={record.data} remarks={record.remarks} upd={upd} updR={updR} />}
                  {sec.type==='locatepin_xy' && <LPXY sec={sec} data={record.data} remarks={record.remarks} upd={upd} />}
                  {sec.type==='feeler' && <Feeler sec={sec} data={record.data} remarks={record.remarks} upd={upd} updR={updR} />}
                  {sec.type==='su' && <SU sec={sec} data={record.data} upd={upd} />}
                  {!['locatepin_simple','locatepin_xy','feeler','su'].includes(sec.type) && <Checklist sec={sec} data={record.data} remarks={record.remarks} upd={upd} updR={updR} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- LP Simple ---- */
function LPSimple({sec, data, remarks, upd, updR}) {
  const half=Math.ceil(sec.items.length/2), left=sec.items.slice(0,half), right=sec.items.slice(half);
  const cols=['#','Locate Pin','Nom','Max','Min','Actual','J','Action'];
  return (
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:9.5,tableLayout:'fixed'}}>
      <thead><tr>{[...cols,...cols].map((h,i)=><th key={i} style={S.th}>{h}</th>)}</tr></thead>
      <tbody>
        {left.map((item,ri)=>{
          const r2=right[ri];
          const k1=`${sec.id}_${item.id}`, v1=data[k1], j1=judgeLP(v1,item.max,item.min);
          const k2=r2?`${sec.id}_${r2.id}`:'', v2=r2?data[k2]:'', j2=r2?judgeLP(v2,r2.max,r2.min):'';
          return (
            <tr key={ri} style={{background:ri%2===0?'#0f172a':'#111827'}}>
              {[{item,k:k1,v:v1,j:j1,n:ri+1},{item:r2,k:k2,v:v2,j:j2,n:ri+half+1}].map((col,ci)=>col.item?(<>
                <td key={`${ci}a`} style={S.td()}>{col.n}</td>
                <td key={`${ci}b`} style={{...S.td(),textAlign:'left',whiteSpace:'nowrap',fontSize:8.5}}>{col.item.id}</td>
                <td key={`${ci}c`} style={S.td()}>{col.item.nom}</td>
                <td key={`${ci}d`} style={S.td()}>{col.item.max}</td>
                <td key={`${ci}e`} style={S.td()}>{col.item.min}</td>
                <td key={`${ci}f`} style={S.td(col.j==='NG')}>
                  <input style={{width:52,background:'transparent',border:'none',textAlign:'center',color:col.j==='NG'?c.ng:c.text,fontSize:9.5}} value={col.v||''} onChange={e=>upd(col.k,e.target.value)} />
                </td>
                <td key={`${ci}g`} style={S.td()}><span style={col.j?S.tag(col.j):{color:c.muted,fontSize:9}}>{col.j||'—'}</span></td>
                <td key={`${ci}h`} style={S.td(col.j==='NG')}>
                  {col.j==='NG'&&<input style={{width:90,background:'transparent',border:`1px solid ${c.ngBorder}`,borderRadius:3,padding:'1px 4px',color:c.ng,fontSize:8.5}} value={remarks[col.k]||''} onChange={e=>updR(col.k,e.target.value)} placeholder="Action..." />}
                </td>
              </>):Array.from({length:8},(_,x)=><td key={`${ci}${x}`} style={{...S.td(),background:'transparent',border:`1px solid ${c.border}30`}}></td>))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---- LP XY ---- */
function LPXY({sec, data, remarks, upd}) {
  return (
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:9.5}}>
      <thead><tr>{['#','Locate Pin','Axis','Nom','Max','Min','Check 1','Check 2','Check 3','Avg','Judgment'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
      <tbody>
        {sec.items.flatMap((item,ri)=>['X','Y'].map((ax,ai)=>{
          const key=`${sec.id}_${item.id}_${ax}`;
          const v1=data[`${key}_1`]||'', v2=data[`${key}_2`]||'', v3=data[`${key}_3`]||'';
          const avg=calcAvg(data,key);
          const j=avg?judgeLP(avg,item.max,item.min):'';
          return (
            <tr key={`${ri}${ax}`} style={{background:ri%2===0?'#0f172a':'#111827'}}>
              {ai===0&&<td rowSpan={2} style={{...S.td(),verticalAlign:'middle'}}>{ri+1}</td>}
              {ai===0&&<td rowSpan={2} style={{...S.td(),textAlign:'left',verticalAlign:'middle',fontWeight:700,whiteSpace:'nowrap'}}>{item.id}</td>}
              <td style={{...S.td(),color:c.accent,fontWeight:700}}>{ax}</td>
              {ai===0&&<td rowSpan={2} style={{...S.td(),verticalAlign:'middle'}}>{item.nom}</td>}
              {ai===0&&<td rowSpan={2} style={{...S.td(),verticalAlign:'middle'}}>{item.max}</td>}
              {ai===0&&<td rowSpan={2} style={{...S.td(),verticalAlign:'middle'}}>{item.min}</td>}
              {[`${key}_1`,`${key}_2`,`${key}_3`].map(k=>(
                <td key={k} style={S.td(j==='NG')}>
                  <input style={{width:46,background:'transparent',border:'none',textAlign:'center',color:j==='NG'?c.ng:c.text,fontSize:9.5}} value={data[k]||''} onChange={e=>upd(k,e.target.value)} />
                </td>
              ))}
              <td style={S.td()}><span style={{color:c.muted}}>{avg||'—'}</span></td>
              <td style={S.td()}><span style={j?S.tag(j):{color:c.muted,fontSize:9}}>{j||'—'}</span></td>
            </tr>
          );
        }))}
      </tbody>
    </table>
  );
}

/* ---- Feeler ---- */
function Feeler({sec, data, remarks, upd, updR}) {
  return (
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:9.5}}>
      <thead><tr>{['#','Support Datum','Standard','Actual (mm)','Judgment','Action (NG)'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
      <tbody>
        {sec.items.map((item,ri)=>{
          const k=`${sec.id}_${item.id}`, v=data[k], j=judgeSD(v);
          return (
            <tr key={ri} style={{background:ri%2===0?'#0f172a':'#111827'}}>
              <td style={S.td()}>{ri+1}</td>
              <td style={{...S.td(),textAlign:'left'}}>Support Datum {ri+1} : {item.id}</td>
              <td style={S.td()}>{'< 0.30 mm'}</td>
              <td style={S.td(j==='NG')}><input style={{width:60,background:'transparent',border:'none',textAlign:'center',color:j==='NG'?c.ng:c.text,fontSize:9.5}} value={v||''} onChange={e=>upd(k,e.target.value)} /></td>
              <td style={S.td()}><span style={j?S.tag(j):{color:c.muted,fontSize:9}}>{j||'—'}</span></td>
              <td style={S.td(j==='NG')}>{j==='NG'&&<input style={{width:110,background:'transparent',border:`1px solid ${c.ngBorder}`,borderRadius:3,padding:'1px 4px',color:c.ng,fontSize:8.5}} value={remarks[k]||''} onChange={e=>updR(k,e.target.value)} placeholder="Action..." />}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---- SU ---- */
function SU({sec, data, upd}) {
  const items=['ปริมาณน้ำมันหล่อลื่น','ปริมาณน้ำในกรองดักความชื้น','เช็คการรั่วซึมของอุปกรณ์','อุปกรณ์ไม่แตกหัก'];
  return (
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:9.5}}>
      <thead><tr>{['#','Service Units Check Point','Checking'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
      <tbody>{items.map((itm,ri)=>{
        const k=`su_SU1_${ri}`, v=data[k]||'';
        return <tr key={ri} style={{background:ri%2===0?'#0f172a':'#111827'}}><td style={S.td()}>{ri+1}</td><td style={{...S.td(),textAlign:'left'}}>{itm}</td><td style={S.td()}><CheckCell val={v} onChange={val=>upd(k,val)} /></td></tr>;
      })}</tbody>
    </table>
  );
}

/* ---- Checklist ---- */
function Checklist({sec, data, remarks, upd, updR}) {
  return (
    <table style={{width:'100%',borderCollapse:'collapse',fontSize:9.5}}>
      <thead><tr>{['#','Check Point','Checking','Action (NG)'].map(h=><th key={h} style={S.th}>{h}</th>)}</tr></thead>
      <tbody>{sec.items.map((item,ri)=>{
        const k=`${sec.id}_${item.id}`, v=data[k]||'';
        return (
          <tr key={ri} style={{background:v==='NG'?c.ngBg:ri%2===0?'#0f172a':'#111827'}}>
            <td style={S.td()}>{ri+1}</td>
            <td style={{...S.td(),textAlign:'left'}}>{item.label}</td>
            <td style={S.td()}><CheckCell val={v} onChange={val=>upd(k,val)} /></td>
            <td style={S.td(v==='NG')}>{v==='NG'&&<input style={{width:'100%',minWidth:120,background:'transparent',border:`1px solid ${c.ngBorder}`,borderRadius:3,padding:'2px 5px',color:c.ng,fontSize:8.5}} value={remarks[k]||''} onChange={e=>updR(k,e.target.value)} placeholder="บันทึก Action..." />}</td>
          </tr>
        );
      })}</tbody>
    </table>
  );
}
