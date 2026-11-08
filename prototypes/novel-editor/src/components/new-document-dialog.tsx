import {workbenchText as t} from '@/lib/workbench-copy';
import { useState } from "react";
import { Newspaper, Sparkles, User, Users, AudioLines, Music, Disc3, CalendarDays, FolderKanban, Building2, MapPin, FileText, type LucideIcon } from "lucide-react";
import {
  documentTemplates,
  type DocumentTemplateType,
} from "@/lib/document-templates";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ChoiceField } from "./form-fields";
const templateIcons: Record<DocumentTemplateType, LucideIcon> = {
  "editorial-article": Newspaper,
  "virtual-avatar": Sparkles,
  person: User,
  unit: Users,
  "software-voice": AudioLines,
  "work-track": Music,
  "work-release": Disc3,
  "live-event": CalendarDays,
  project: FolderKanban,
  organization: Building2,
  "lore-concept": MapPin,
};
export function NewDocumentDialog({
  open,
  onOpenChange,
  initialLocale,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialLocale: string;
  onCreate: (type: DocumentTemplateType, locale: string) => void;
}) {
  const [locale, setLocale] = useState(
    ["zh", "ja", "en"].includes(initialLocale) ? initialLocale : "zh",
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("新建词条")}</DialogTitle>
          <DialogDescription>
            {t("选择你要写的内容。先写正文，资料可在属性面板继续完善。")}</DialogDescription>
        </DialogHeader>
        <ChoiceField
          label={t("写作语言")}
          value={locale}
          onChange={setLocale}
          options={[
            ["zh", "简体中文"],
            ["ja", "日文"],
            ["en", "英文"],
          ]}
          note={t("繁体页面由简体原文生成，无需重复填写。")}
        />
        <div
          className="grid min-h-0 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3"
          aria-label={t("选择词条类型")}
        >
          {documentTemplates.map((template) => (
            <Button
              key={template.type}
              variant="outline"
              className="h-auto min-h-24 items-start justify-start whitespace-normal p-3 text-left"
              aria-label={t("新建")+t(template.label)}
              onClick={() => onCreate(template.type, locale)}
            >
              {(() => { const Icon = templateIcons[template.type] || FileText; return <Icon className="mt-1 shrink-0" aria-hidden="true" />; })()}
              <span>
                <strong className="block">{t(template.label)}</strong>
                <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">
                  {t(template.description)}
                </span>
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
