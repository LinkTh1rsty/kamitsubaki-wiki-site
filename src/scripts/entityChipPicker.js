// Turns a comma-separated entity-id input into a searchable chip picker.
// The original input stays the source of truth (hidden), so saving, restoring
// and validation keep working with ids while people choose by name.
export function mountEntityChipPicker(input,entities,{removeLabel='Remove',placeholder=''}={}){
 const byId=new Map(entities.map(entity=>[entity.id,entity]));
 const wrap=document.createElement('div');wrap.className='entity-chip-picker';
 const chips=document.createElement('ul');chips.className='entity-chip-picker__chips';
 const search=document.createElement('input');search.type='search';search.className='workspace-control dui-input';search.dataset.uiKit='';search.placeholder=placeholder;search.setAttribute('list',input.getAttribute('list')||'');search.autocomplete='off';
 const label=input.closest('label');if(label?.id)search.setAttribute('aria-labelledby',label.id);
 input.removeAttribute('list');input.hidden=true;input.after(wrap);wrap.append(chips,search);
 const ids=()=>input.value.split(',').map(value=>value.trim()).filter(Boolean);
 const write=next=>{input.value=[...new Set(next)].join(', ');input.dispatchEvent(new Event('input',{bubbles:true}));render();};
 function render(){
  chips.replaceChildren(...ids().map(id=>{
   const item=document.createElement('li'),name=document.createElement('span'),remove=document.createElement('button');
   name.textContent=byId.get(id)?.name||id;remove.type='button';remove.textContent='×';remove.setAttribute('aria-label',`${removeLabel} ${name.textContent}`);
   remove.onclick=()=>{write(ids().filter(value=>value!==id));search.focus();};item.append(name,remove);return item;
  }));
 }
 const resolve=value=>{const text=value.trim().toLowerCase();if(!text)return null;return byId.has(value.trim())?value.trim():entities.find(entity=>entity.name.toLowerCase()===text||entity.id===text)?.id||null;};
 const commit=()=>{const id=resolve(search.value);if(!id)return false;write([...ids(),id]);search.value='';return true;};
 search.addEventListener('change',commit);
 search.addEventListener('keydown',event=>{if(event.key==='Enter'){if(commit())event.preventDefault();}else if(event.key==='Backspace'&&!search.value&&ids().length){write(ids().slice(0,-1));}});
 input.addEventListener('input',event=>{if(event.isTrusted)render();});
 render();
 return {render};
}
