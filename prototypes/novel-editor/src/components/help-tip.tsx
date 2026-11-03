import {Popover} from 'radix-ui';
import {CircleHelp} from 'lucide-react';
import {workbenchText as t} from '@/lib/workbench-copy';
export function HelpTip({label,text}:{label:string;text:string}) {
 return <Popover.Root><Popover.Trigger asChild><button type="button" className="wiki-help-trigger" aria-label={`${t(label)} — ?`} title={t(text)}><CircleHelp size={16}/></button></Popover.Trigger><Popover.Portal><Popover.Content className="wiki-help-content" sideOffset={8} collisionPadding={16}><strong>{t(label)}</strong><p>{t(text)}</p><Popover.Arrow/></Popover.Content></Popover.Portal></Popover.Root>;
}
