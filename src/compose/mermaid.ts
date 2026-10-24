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
 * The page script of a restitution, plain ES5 text: inlined as is in a full page, injected by the browser loader.
 * It runs in the browser once the fonts are there, in two steps:
 *
 * 1. Diagrams (only if the document has some). Mermaid is loaded from the CDN and each box is drawn so that it is
 *    never taller than its A4 page. A flowchart is rendered at three node widths and the one with the largest text
 *    is kept; any other kind is rendered at a font size raised so that, once scaled to the page width, its text is
 *    the body size of the design system. The available height is that of a full content page, not the space
 *    remaining among preceding sections; pagination then moves the diagram when necessary.
 *    Without the script, or if it fails, the fallback text of each box stays on the page.
 * 2. Content pagination (always). Short sections share a page. A page taller than A4 hands its surplus to a page that
 *    follows, with the same header and footer. It cuts only between elements: a paragraph, a list item, a table row,
 *    an intertitre is never left alone at the bottom of a page, a pull quote is never cut. A table that is cut says
 *    its head again; the reading box goes on in the same kind of box.
 *
 * The footers are renumbered at the end.
 */
const BOOT = String.raw`
(function(c){
if(document.documentElement.getAttribute("data-vr-ready")==="1")return;
var BODY=c.body;
function ext(a,b){var o={},k;for(k in a)o[k]=a[k];for(k in b)o[k]=b[k];return o}
function pageMin(page){return parseFloat(getComputedStyle(page).minHeight)||1123}
function areaOf(box){var comp=box.closest(".va-composition"),page=box.closest(".va-page");
return{comp:comp,page:page,min:pageMin(page),chrome:page.offsetHeight-comp.offsetHeight,gap:parseFloat(getComputedStyle(comp).rowGap)||0}}
function newPage(page,after){var np=page.cloneNode(true),comp=np.querySelector(".va-composition");
while(comp.firstChild)comp.removeChild(comp.firstChild);
page.parentNode.insertBefore(np,after.nextSibling);return comp}
function number(){var pages=document.querySelectorAll("article.va-page"),t=pages.length,i,f;
function p2(n){return("0"+n).slice(-2)}
for(i=0;i<t;i++){f=pages[i].querySelector(".va-page-footer span:last-child");if(f)f.textContent=p2(i+1)+" / "+p2(t);
var heading=pages[i].querySelector(".va-composition h2,.va-composition h3");
pages[i].setAttribute("aria-label","Page "+(i+1)+(heading?" : "+heading.textContent:""))}}

function diagrams(){
var boxes=document.querySelectorAll(".vr-diagram[data-mermaid]");if(!boxes.length)return Promise.resolve();
return new Promise(function(done){
var s=document.createElement("script");s.integrity=c.integrity;s.crossOrigin="anonymous";s.src=c.url;s.async=true;
s.onerror=function(){done()};
s.onload=function(){
var M=window.mermaid;if(!M){done();return}
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
function aloneH(box){var a=areaOf(box);return a.min-a.chrome-2}
function place(box,x){box.innerHTML=x.r.svg;var v=box.querySelector("svg");
v.setAttribute("width",String(Math.round(x.r.w*x.k)));v.removeAttribute("height");v.style.maxWidth="100%";
box.removeAttribute("data-mermaid")}
function draw(box,n){var pre=box.querySelector("pre.mermaid");if(!pre)return;
var src=pre.textContent.trim(),W=box.clientWidth;
return gather(box.getAttribute("data-mermaid"),src,"vr-m"+n+"-",W).then(function(list){
if(!list.length)return;
var x=best(list,W,aloneH(box));
place(box,x)})}
var seq=Promise.resolve();
Array.prototype.forEach.call(boxes,function(box,n){seq=seq.then(function(){return draw(box,n)}).catch(function(){})});
seq.then(done,done)};
document.head.appendChild(s)})}

function isTitle(el){return el.matches(".vd-heading,.vd-subheading")}
function hostOf(el){
if(el.matches(".va-composition,.vr-section,.vd-text,.vr-figures,.va-reading-section,ul,ol"))return el;
if(el.matches(".vd-callout"))return el.querySelector(":scope > div > div");
if(el.matches(".vd-table,.vd-comparison"))return el.querySelector("tbody");
return null}
function chain(el,host){var path=[],n=host,top=null,inner=null;
for(;;){path.unshift(n);if(n===el)break;n=n.parentNode}
path.forEach(function(q){var cl=q.cloneNode(false),th,sv;
if(q.tagName==="TABLE"){th=q.querySelector("thead");if(th)cl.appendChild(th.cloneNode(true))}
if(q.matches(".vd-callout")){sv=q.querySelector(":scope > svg");if(sv)cl.appendChild(sv.cloneNode(true))}
if(inner)inner.appendChild(cl);else top=cl;inner=cl});
return{top:top,inner:inner}}
/* What of el sticks out under limit: null (nothing), {whole:true} (all of it moves on) or {tail:node} (el is cut and tail holds the rest). */
function cut(el,limit,force,capacity,top){
var rect=el.getBoundingClientRect();
if(rect.bottom<=limit)return null;
/* A complete section or case that fits an empty page moves as a unit, title and diagram included. */
if(el.matches(".vr-section,.va-reading-section")&&rect.height<=capacity&&rect.top>top+1)return{whole:true};
var host=hostOf(el);if(!host)return{whole:true};
var kids=[].slice.call(host.children),j=0,partial=false,r=null,s,tailKids,ch;
if(!kids.length)return{whole:true};
limit-=Math.max(0,el.getBoundingClientRect().bottom-kids[kids.length-1].getBoundingClientRect().bottom);
while(j<kids.length&&kids[j].getBoundingClientRect().bottom<=limit)j++;
if(j===kids.length)return null;
s=j;
if(kids[j].getBoundingClientRect().top<limit){r=cut(kids[j],limit,force&&kids.slice(0,j).every(isTitle),capacity,top);if(r&&r.tail){partial=true;s=j+1}}
if(!partial)while(s>0&&isTitle(kids[s-1]))s--;
if(s===0){if(!force)return{whole:true};
/* An indivisible first unit may exceed a page; retain its title rather than emitting a title-only page. */
s=1;while(s<kids.length&&isTitle(kids[s-1]))s++}
tailKids=kids.slice(s);if(partial)tailKids.unshift(r.tail);
if(!tailKids.length)return{whole:true};
ch=chain(el,host);tailKids.forEach(function(k){ch.inner.appendChild(k)});
return{tail:ch.top}}
function paginate(){
var pages=[].slice.call(document.querySelectorAll("article.va-page"));
pages.forEach(function(page){
for(;;){
var comp=page.querySelector(".va-composition"),pr=page.getBoundingClientRect(),cr=comp.getBoundingClientRect(),
limit=pr.top+pageMin(page)-(pr.bottom-cr.bottom),r;
if(cr.bottom<=limit+1)break;
r=cut(comp,limit,true,limit-cr.top,cr.top);
if(!r||!r.tail||!r.tail.children.length){page.setAttribute("data-vr-overflow","1");break;}
var nc=newPage(page,page);
while(r.tail.firstChild)nc.appendChild(r.tail.firstChild);
page=nc.closest(".va-page")}});
/* Report a genuinely indivisible unit after every cut, including the page it left behind. */
Array.prototype.forEach.call(document.querySelectorAll("article.va-page"),function(p){
var comp=p.querySelector(".va-composition"),pr=p.getBoundingClientRect(),cr=comp.getBoundingClientRect();
if(cr.bottom>pr.top+pageMin(p)-(pr.bottom-cr.bottom)+1)p.setAttribute("data-vr-overflow","1");
else p.removeAttribute("data-vr-overflow")})}

var fam=String(c.theme.fontFamily).split(",")[0];
(document.fonts?Promise.all([document.fonts.load("16px "+fam),document.fonts.load("600 16px "+fam),document.fonts.ready]).catch(function(){}):Promise.resolve())
.then(diagrams).then(function(){return document.fonts?document.fonts.ready:Promise.resolve()})
.then(function(){paginate();number();document.documentElement.setAttribute("data-vr-ready","1")})
})(`;

export function bootScript(charte: Charte): string {
  const cfg = JSON.stringify({
    url: MERMAID_URL,
    integrity: MERMAID_INTEGRITY,
    theme: mermaidTheme(charte),
    body: 16,
  }).replace(/</g, '\\u003c');
  return `${BOOT.trim()}${cfg});`;
}
