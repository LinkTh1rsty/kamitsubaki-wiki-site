import {editorHost} from '@/lib/editor-host';
import {workbenchText as t} from '@/lib/workbench-copy';
import {Button} from './ui/button';
import {DropdownMenuItem} from './ui/dropdown-menu';
export function HostNavigation({menu=false}:{menu?:boolean}) {
 const host=editorHost();if(!host)return null;
 const recovery=document.querySelector<HTMLButtonElement>('[data-legacy-recovery]');
 const signedIn=host.ownerId&&!['guest','unverified'].includes(host.ownerId);
 const links=[{href:host.backHref||`/${host.locale}/`,label:host.backLabel||t('返回 Wiki')},{href:`/${host.locale}/account/creator/`,label:t('投稿记录')},{href:signedIn?`/${host.locale}/account/`:host.loginHref,label:signedIn?`${host.accountName||t('我的账号')} · ${t('我的空间')}`:t('登录 / 注册')}];
 return <>{links.map(link=>menu?<DropdownMenuItem key={link.href} asChild><a href={link.href}>{link.label}</a></DropdownMenuItem>:<Button key={link.href} asChild variant="ghost" className="wiki-nav-row"><a href={link.href}>{link.label}</a></Button>)}{recovery&&!recovery.hidden?(menu?<DropdownMenuItem onSelect={()=>document.querySelector<HTMLButtonElement>('[data-legacy-recovery]')?.click()}>{t('恢复旧版本地草稿')}</DropdownMenuItem>:<Button variant="ghost" className="wiki-nav-row" onClick={()=>document.querySelector<HTMLButtonElement>('[data-legacy-recovery]')?.click()}>{t('恢复旧版本地草稿')}</Button>):null}</>;
}
