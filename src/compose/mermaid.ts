import type { Charte } from '../charte.js';

export const MERMAID_VERSION = '11.12.0';
export const MERMAID_URL = `https://cdnjs.cloudflare.com/ajax/libs/mermaid/${MERMAID_VERSION}/mermaid.min.js`;
/**
 * Subresource integrity of the exact file above. Computed by scripts/sri.mjs (sha384 of the downloaded
 * file; the sha512 matches the one cdnjs publishes) and recomputed by test/sri.test.ts.
 */
export const MERMAID_INTEGRITY = 'sha384-o+g/BxPwhi0C3RK7oQBxQuNimeafQ3GE/ST4iT2BxVI4Wzt60SH4pq9iXVYujjaS';

/** Mermaid theme variables, all taken from the charte tokens. */
export function mermaidTheme(charte: Charte): Record<string, string> {
  const t = charte.tokens;
  const ink = t['--ds-navy']!;
  const accent = t['--ds-blue']!;
  const soft = t['--ds-mist']!;
  const line = t['--ds-silver']!;
  const paper = t['--ds-white']!;
  const vars: Record<string, string> = {
    fontFamily: t['--ds-font-body']!,
    fontSize: '16px',
    background: paper,
    primaryColor: paper,
    primaryTextColor: ink,
    primaryBorderColor: line,
    nodeBorder: line,
    lineColor: accent,
    secondaryColor: soft,
    tertiaryColor: soft,
    clusterBkg: soft,
    clusterBorder: line,
    textColor: ink,
    edgeLabelBackground: paper,
  };
  for (let k = 0; k < 12; k++) {
    vars[`cScale${k}`] = soft;
    vars[`cScaleLabel${k}`] = ink;
    vars[`cScalePeer${k}`] = accent;
    vars[`cScaleInv${k}`] = accent;
  }
  return vars;
}

/**
 * The script that draws the Mermaid boxes (flowchart, timeline, mindmap, journey) once the library is loaded
 * from the CDN. Without it, or if it fails, the fallback text of each box stays on the page.
 * Plain ES5 text: it is inlined as is in a full page, and injected by the browser loader.
 *
 * A diagram is never taller than its A4 page. For each box the script:
 *  1. renders a few candidates (a flowchart at three node widths; any other kind at a font size raised so that,
 *     once the drawing is scaled to the page width, its text is the body size of the design system);
 *  2. keeps the first candidate whose text, scaled to the free height of the page, stays at the body size,
 *     else the one with the largest text;
 *  3. if that text would fall under MIN px, gives the diagram a page of its own when that makes it larger: the
 *     text before it stays on the page, the text after it goes to the next page; the footers are renumbered.
 */
const BOOT = String.raw`
(function(c){
var boxes=document.querySelectorAll(".vr-diagram[data-mermaid]");if(!boxes.length)return;
var s=document.createElement("script");s.integrity=c.integrity;s.crossOrigin="anonymous";s.src=c.url;s.async=true;
s.onload=function(){
var M=window.mermaid;if(!M)return;
var BODY=c.body,MIN=c.min;
function ext(a,b){var o={},k;for(k in a)o[k]=a[k];for(k in b)o[k]=b[k];return o}
function render(src,id,cfg,fs){
M.initialize(ext({startOnLoad:false,theme:"base",securityLevel:"strict",fontFamily:c.theme.fontFamily,fontSize:fs,themeVariables:ext(c.theme,{fontSize:fs+"px"})},cfg));
return M.render(id,src).then(function(r){
var m=/viewBox="\s*(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s*"/.exec(r.svg);
return m?{svg:r.svg,w:parseFloat(m[3]),h:parseFloat(m[4]),fs:fs}:null
},function(){var e=document.getElementById("d"+id);if(e)e.remove();return null})}
function gather(kind,src,id,W){
var out=[];
function one(cfg,fs,k){return render(src,id+k,cfg,fs).then(function(r){if(r)out.push(r);return r})}
if(kind==="flowchart"){
var seq=Promise.resolve();
[200,320,440].forEach(function(w,k){seq=seq.then(function(){return one({flowchart:{wrappingWidth:w,nodeSpacing:30,rankSpacing:36,padding:10}},BODY,k)})});
return seq.then(function(){return out})}
return one({},BODY,0).then(function(r){
var fs=r?Math.min(28,Math.max(BODY,Math.round(BODY*r.w/W))):BODY;
return fs>BODY?one({},fs,1):null}).then(function(){return out})}
function score(r,W,H){var k=Math.min(1,W/r.w,Math.max(H,1)/r.h);return{r:r,k:k,eff:r.fs*k}}
function best(list,W,H){var top=null,i,x;for(i=0;i<list.length;i++){x=score(list[i],W,H);if(x.eff>=BODY-0.05)return x;if(!top||x.eff>top.eff)top=x}return top}
function areaOf(box){var comp=box.parentNode,page=box.closest(".va-page");
return{comp:comp,page:page,min:parseFloat(getComputedStyle(page).minHeight)||1123,chrome:page.offsetHeight-comp.offsetHeight,gap:parseFloat(getComputedStyle(comp).rowGap)||0}}
function freeH(box){var a=areaOf(box),prev=box.style.display,kids=a.comp.children,sum=0,n=0,i;
box.style.display="none";
for(i=0;i<kids.length;i++){if(kids[i]===box||getComputedStyle(kids[i]).display==="none")continue;sum+=kids[i].offsetHeight;n++}
a=areaOf(box);box.style.display=prev;
return a.min-a.chrome-sum-a.gap*n-2}
function aloneH(box){var a=areaOf(box);return a.min-a.chrome-2}
function newPage(page,after){var np=page.cloneNode(true),comp=np.querySelector(".va-composition");
while(comp.firstChild)comp.removeChild(comp.firstChild);
page.parentNode.insertBefore(np,after.nextSibling);return comp}
function ownPage(box){var a=areaOf(box),kids=[].slice.call(a.comp.children),i=kids.indexOf(box),t=0,rest,before,page=a.page;
while(t<i&&/vd-(sub)?heading/.test(kids[t].className))t++;
before=kids.slice(t,i);rest=kids.slice(i+1);
if(!before.length&&!rest.length)return false;
var cur=page,comp;
if(before.length){comp=newPage(page,cur);cur=comp.closest(".va-page");comp.appendChild(box)}
if(rest.length){comp=newPage(page,cur);rest.forEach(function(el){comp.appendChild(el)})}
return true}
function place(box,x){box.innerHTML=x.r.svg;var v=box.querySelector("svg");
v.setAttribute("width",String(Math.round(x.r.w*x.k)));v.removeAttribute("height");v.style.maxWidth="100%";
box.removeAttribute("data-mermaid")}
function draw(box,n){var pre=box.querySelector("pre.mermaid");if(!pre)return;
var src=pre.textContent.trim(),W=box.clientWidth;
return gather(box.getAttribute("data-mermaid"),src,"vr-m"+n+"-",W).then(function(list){
if(!list.length)return;
var x=best(list,W,freeH(box)),y;
if(x.eff<MIN){y=best(list,W,aloneH(box));if(y.eff>x.eff+0.5&&ownPage(box))x=best(list,W,freeH(box))}
place(box,x)})}
function number(){var pages=document.querySelectorAll("article.va-page"),t=pages.length,i,f;
function p2(n){return("0"+n).slice(-2)}
for(i=0;i<t;i++){f=pages[i].querySelector(".va-page-footer span:last-child");if(f)f.textContent=p2(i+1)+" / "+p2(t)}}
var fam=String(c.theme.fontFamily).split(",")[0];
(document.fonts?Promise.all([document.fonts.load("16px "+fam),document.fonts.load("600 16px "+fam),document.fonts.ready]).catch(function(){}):Promise.resolve()).then(function(){
var seq=Promise.resolve();
Array.prototype.forEach.call(boxes,function(box,n){seq=seq.then(function(){return draw(box,n)}).catch(function(){})});
return seq}).then(number)};
document.head.appendChild(s)})(`;

export function mermaidBootScript(charte: Charte): string {
  const cfg = JSON.stringify({
    url: MERMAID_URL,
    integrity: MERMAID_INTEGRITY,
    theme: mermaidTheme(charte),
    body: 16,
    min: 11,
  }).replace(/</g, '\\u003c');
  return `${BOOT.trim()}${cfg});`;
}
