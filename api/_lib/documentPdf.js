import fs from 'node:fs';
import PDFDocument from 'pdfkit';

const FONT_REGULAR=new URL('../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff',import.meta.url);
const FONT_BOLD=new URL('../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff',import.meta.url);
const SUMMARY_HEADINGS=new Set([
  'Where things are now',
  'What we have been working on',
  'Patterns across our recent work',
  'What has shifted — and what has been different',
  'Strengths and resources',
  'Making sense of what we have noticed',
  'A gentle CBT perspective',
  'An integrative perspective',
  'An Internal Family Systems perspective',
  'Different parts of you in this work',
  'A Transactional Analysis perspective',
  'Ideas to carry forward',
  'Closing reflection'
]);

function text(value){return String(value??'').replace(/\r\n?/g,'\n');}
function formatDate(value){if(!value)return'';const date=new Date(`${value}T00:00:00Z`);return Number.isNaN(date.getTime())?text(value):new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(date);}
function metadataLines(draft){const period=draft.period_start?`${formatDate(draft.period_start)}${draft.period_end?` – ${formatDate(draft.period_end)}`:''}`:'';return[[draft.client_name,'Client'],[draft.recipient,'Recipient'],[draft.purpose,'Purpose'],[period,'Period']].filter(([value])=>text(value).trim());}
function isClientDocument(draft){return !draft.scope||draft.scope==='client';}
function isSessionSummary(draft){return draft.document_type==='session_summary';}
function pageBottom(pdf){return pdf.page.height-pdf.page.margins.bottom;}
function pageCapacity(pdf){return pageBottom(pdf)-pdf.page.margins.top;}
function ensureSpace(pdf,height){
  const needed=Math.max(0,Number(height)||0);
  if(pdf.y>pdf.page.margins.top+1&&pdf.y+needed>pageBottom(pdf))pdf.addPage();
}
function textHeight(pdf,value,options){return pdf.heightOfString(text(value),options);}
function renderPlainHeading(pdf,value,pageWidth){
  const options={width:pageWidth,lineGap:2};
  pdf.font('NotoSansBold').fontSize(12).fillColor('#111827');
  ensureSpace(pdf,textHeight(pdf,value,options)+24);
  pdf.text(text(value),options);
  pdf.moveDown(0.55);
}
function renderPlainParagraph(pdf,value,pageWidth){
  const options={width:pageWidth,align:'left',lineGap:3};
  pdf.font('NotoSans').fontSize(10.5).fillColor('#111827');
  const height=textHeight(pdf,value,options);
  if(height<=pageCapacity(pdf)-4)ensureSpace(pdf,height+10);
  pdf.text(text(value),options);
  pdf.moveDown(0.8);
}

function addBufferedFooters(pdf,draft){
  const range=pdf.bufferedPageRange();
  for(let index=range.start;index<range.start+range.count;index+=1){
    pdf.switchToPage(index);
    const originalBottom=pdf.page.margins.bottom;
    pdf.page.margins.bottom=0;
    const y=pdf.page.height-38;
    const label=isSessionSummary(draft)?'Helio Therapist · Session summary':isClientDocument(draft)?'Helio Therapist · Confidential clinical document':'Helio Therapist · Document';
    const pageNumber=index-range.start+1;
    const total=range.count;
    pdf.save().font('NotoSans').fontSize(8).fillColor('#6b7280')
      .text(label,pdf.page.margins.left,y,{width:pdf.page.width-pdf.page.margins.left-pdf.page.margins.right-70,align:'left',lineBreak:false})
      .text(`${pageNumber} / ${total}`,pdf.page.width-pdf.page.margins.right-60,y,{width:60,align:'right',lineBreak:false})
      .restore();
    pdf.page.margins.bottom=originalBottom;
  }
}

function inlineText(node){
  if(!node)return'';
  if(node.type==='text')return text(node.text);
  if(node.type==='hardBreak')return'\n';
  return (node.content||[]).map(inlineText).join('');
}

function listItemText(node){
  const parts=[];
  for(const child of node.content||[]){
    if(child.type==='paragraph'||child.type==='heading')parts.push(inlineText(child));
  }
  return parts.filter(Boolean).join(' ');
}

function renderRichNodes(pdf,nodes,pageWidth,{indent=0}={}){
  for(let nodeIndex=0;nodeIndex<(nodes||[]).length;nodeIndex+=1){
    const node=nodes[nodeIndex];
    if(!node)continue;
    if(node.type==='pageBreak'){
      if(pdf.y>pdf.page.margins.top+2)pdf.addPage();
      continue;
    }
    if(node.type==='horizontalRule'){
      ensureSpace(pdf,20);
      pdf.moveTo(pdf.x,pdf.y).lineTo(pdf.x+pageWidth-indent,pdf.y).lineWidth(0.7).strokeColor('#d1d5db').stroke();
      pdf.moveDown(0.8);
      continue;
    }
    if(node.type==='heading'){
      const level=Number(node.attrs?.level||2);
      const size=level<=2?14:12;
      const value=inlineText(node).trim();
      if(value){
        const options={width:pageWidth-indent,lineGap:2};
        pdf.font('NotoSansBold').fontSize(size).fillColor('#111827');
        const headingHeight=textHeight(pdf,value,options);
        const nextNode=(nodes||[])[nodeIndex+1];
        let keepWithNext=18;
        if(nextNode?.type==='paragraph'){
          const nextValue=inlineText(nextNode).trim();
          if(nextValue){
            pdf.font('NotoSans').fontSize(10.5);
            keepWithNext=Math.min(textHeight(pdf,nextValue,{width:pageWidth-indent,lineGap:2.5}),36);
          }
        }
        pdf.font('NotoSansBold').fontSize(size).fillColor('#111827');
        ensureSpace(pdf,headingHeight+keepWithNext+8);
        pdf.text(value,options);
      }
      pdf.moveDown(0.45);
      continue;
    }
    if(node.type==='paragraph'){
      const value=inlineText(node);
      if(value.trim()){
        const options={width:pageWidth-indent,align:'left',lineGap:2.5};
        pdf.font('NotoSans').fontSize(10.5).fillColor('#111827');
        const height=textHeight(pdf,value,options);
        if(height<=pageCapacity(pdf)-4)ensureSpace(pdf,height+8);
        pdf.text(value,options);
      }else{
        pdf.moveDown(0.55);
      }
      pdf.moveDown(0.35);
      continue;
    }
    if(node.type==='blockquote'){
      const value=(node.content||[]).map(inlineText).join('\n').trim();
      if(value){
        const options={width:pageWidth-indent-12,lineGap:2.5};
        pdf.font('NotoSans').fontSize(10.5);
        const height=textHeight(pdf,value,options);
        if(height<=pageCapacity(pdf)-4)ensureSpace(pdf,height+10);
        const x=pdf.x;
        const y=pdf.y;
        pdf.save().strokeColor('#cfd8dc').lineWidth(2).moveTo(x,y).lineTo(x,y+height).stroke().restore();
        pdf.font('NotoSans').fontSize(10.5).fillColor('#52616b').text(value,x+12,y,options);
        pdf.moveDown(0.6);
      }
      continue;
    }
    if(node.type==='bulletList'||node.type==='orderedList'){
      let index=1;
      for(const item of node.content||[]){
        if(item.type!=='listItem')continue;
        const value=listItemText(item);
        const prefix=node.type==='orderedList'?`${index}. `:'• ';
        if(value){
          const options={indent:12,width:pageWidth-indent-12,lineGap:2.5};
          pdf.font('NotoSans').fontSize(10.5).fillColor('#111827');
          const height=textHeight(pdf,`${prefix}${value}`,options);
          if(height<=pageCapacity(pdf)-4)ensureSpace(pdf,height+6);
          pdf.text(`${prefix}${value}`,options);
        }
        pdf.moveDown(0.25);
        index+=1;
      }
      pdf.moveDown(0.35);
      continue;
    }
    if(node.content?.length)renderRichNodes(pdf,node.content,pageWidth,{indent});
  }
}

function renderPlainBody(pdf,body,pageWidth){
  if(!body){
    pdf.font('NotoSans').fontSize(10.5).fillColor('#6b7280').text('No document body supplied.');
    return;
  }
  for(const paragraph of body.split(/\n{2,}/)){
    const normalized=paragraph.trim();
    if(!normalized)continue;
    const lines=normalized.split('\n');
    const firstLine=lines[0].trim();
    if(SUMMARY_HEADINGS.has(firstLine)&&lines.length>1){
      renderPlainHeading(pdf,firstLine,pageWidth);
      const remainder=lines.slice(1).join('\n').trim();
      if(remainder)renderPlainParagraph(pdf,remainder,pageWidth);
      continue;
    }
    const isHeading=normalized.length<=90&&!normalized.includes('\n')&&(/^(what we discussed|key understanding|agreed actions|what to carry forward|session\s|summary|background|progress|recommendations?|plan|assessment|clinical|purpose|outcome)/i.test(normalized)||SUMMARY_HEADINGS.has(normalized));
    if(isHeading)renderPlainHeading(pdf,normalized,pageWidth);
    else renderPlainParagraph(pdf,normalized,pageWidth);
  }
}

export async function buildDocumentPdf(draft){
  const chunks=[];
  const fallback=isSessionSummary(draft)?'Session summary':isClientDocument(draft)?'Client document':'Document';
  const pdf=new PDFDocument({size:'A4',bufferPages:true,margins:{top:54,bottom:64,left:58,right:58},info:{Title:text(draft.title||fallback),Author:'Helio',Subject:text(draft.purpose||draft.document_type||fallback),Creator:'Helio Therapist'}});
  pdf.on('data',chunk=>chunks.push(chunk));
  const done=new Promise((resolve,reject)=>{pdf.on('end',()=>resolve(Buffer.concat(chunks)));pdf.on('error',reject);});
  pdf.registerFont('NotoSans',fs.readFileSync(FONT_REGULAR));
  pdf.registerFont('NotoSansBold',fs.readFileSync(FONT_BOLD));

  const pageWidth=pdf.page.width-pdf.page.margins.left-pdf.page.margins.right;
  pdf.font('NotoSansBold').fontSize(9).fillColor('#6b7280').text(isSessionSummary(draft)?'SESSION SUMMARY':'HELIO THERAPIST',{characterSpacing:1.2});
  pdf.moveDown(0.8);
  pdf.font('NotoSansBold').fontSize(22).fillColor('#111827').text(text(draft.title||fallback),{width:pageWidth});
  pdf.moveDown(0.8);

  const meta=metadataLines(draft);
  if(meta.length){
    for(const [value,label] of meta){
      pdf.font('NotoSansBold').fontSize(9).fillColor('#4b5563').text(`${label}:`,{continued:true});
      pdf.font('NotoSans').fillColor('#111827').text(` ${text(value)}`);
    }
    pdf.moveDown(0.8);
  }

  pdf.moveTo(pdf.x,pdf.y).lineTo(pdf.x+pageWidth,pdf.y).lineWidth(0.7).strokeColor('#d1d5db').stroke();
  pdf.moveDown(1.1);

  const richContent=draft.content?.richContent;
  if(richContent?.type==='doc'&&Array.isArray(richContent.content))renderRichNodes(pdf,richContent.content,pageWidth);
  else renderPlainBody(pdf,text(draft.content?.body||'').trim(),pageWidth);

  addBufferedFooters(pdf,draft);
  pdf.end();
  return done;
}
