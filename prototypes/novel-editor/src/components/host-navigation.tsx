import {editorHost} from '@/lib/editor-host';
import {workbenchText as t} from '@/lib/workbench-copy';
import {ArrowLeft, History, UserRound, LogIn, ArchiveRestore} from 'lucide-react';
import {Button} from './ui/button';
import {DropdownMenuItem} from './ui/dropdown-menu';
export function HostNavigation({menu=false,footer=false}:{menu?:boolean;footer?:boolean}) {
 const host=editorHost();if(!host)return null;
 const recovery=document.querySelector<HTMLButtonElement>('[data-legacy-recovery]');
 const signedIn=host.ownerId&&!['guest','unverified'].includes(host.ownerId);
 const links=[{href:host.backHref||`/${host.locale}/`,label:host.backLabel||t('返回 Wiki'),icon:ArrowLeft},{href:`/${host.locale}/account/creator/`,label:t('投稿记录'),icon:History},{href:signedIn?`/${host.locale}/account/`:host.loginHref,label:signedIn?`${host.accountName||t('我的账号')} · ${t('我的空间')}`:t('登录 / 注册'),icon:signedIn?UserRound:LogIn}];
 const restore=()=>document.querySelector<HTMLButtonElement>('[data-legacy-recovery]')?.click();
 const items=<>{links.map(link=>menu?<DropdownMenuItem key={link.href} asChild><a href={link.href} target={host.embedded ? "_top" : undefined}><link.icon/>{link.label}</a></DropdownMenuItem>:<Button key={link.href} asChild variant="ghost" className="wiki-nav-row"><a href={link.href} target={host.embedded ? "_top" : undefined}><link.icon data-icon="inline-start"/><span className="truncate">{link.label}</span></a></Button>)}{recovery&&!recovery.hidden?(menu?<DropdownMenuItem onSelect={restore}><ArchiveRestore/>{t('恢复旧版本地草稿')}</DropdownMenuItem>:<Button variant="ghost" className="wiki-nav-row" onClick={restore}><ArchiveRestore data-icon="inline-start"/><span className="truncate">{t('恢复旧版本地草稿')}</span></Button>):null}</>;
 return footer?<nav className="wiki-host-footer" aria-label={t('站点与账号')}>{items}</nav>:items;
}
