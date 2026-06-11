"use client";

import React, { useState } from "react";
import { useTranslation } from "./i18n-provider";
import { 
  IconClock, 
  IconPlus, 
  IconTrash, 
  IconEdit, 
  IconAlertCircle, 
  IconCheck, 
  IconDatabase,
  IconCalendarStats,
  IconCalendar,
  IconChevronRight,
  IconAdjustments
} from "@tabler/icons-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { addScheduleAction, updateScheduleAction, deleteScheduleAction } from "../app/actions";

interface Database {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  databaseId: string;
  cron: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  database: Database;
}

interface SchedulesPageClientProps {
  initialDatabases: Database[];
  initialSchedules: Schedule[];
  timezone: string;
}

const DAYS_OF_WEEK = [
  { value: "1", labelTr: "Pazartesi", labelEn: "Monday" },
  { value: "2", labelTr: "Salı", labelEn: "Tuesday" },
  { value: "3", labelTr: "Çarşamba", labelEn: "Wednesday" },
  { value: "4", labelTr: "Perşembe", labelEn: "Thursday" },
  { value: "5", labelTr: "Cuma", labelEn: "Friday" },
  { value: "6", labelTr: "Cumartesi", labelEn: "Saturday" },
  { value: "0", labelTr: "Pazar", labelEn: "Sunday" },
];

function getCronDescription(cronStr: string, t: any, locale: string) {
  const parts = cronStr.trim().split(/\s+/);
  if (parts.length !== 5) return cronStr;

  const [min, hour, dayOfMonth, month, dayOfWeek] = parts;

  const getDayLabel = (val: string) => {
    const day = DAYS_OF_WEEK.find(d => d.value === val);
    if (!day) return val;
    return locale === "tr" ? day.labelTr : day.labelEn;
  };

  // Check if it matches Daily: "M H * * *"
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    const formattedHour = hour.padStart(2, "0");
    const formattedMin = min.padStart(2, "0");
    return `${t("schedules.daily")} @ ${formattedHour}:${formattedMin}`;
  }

  // Check if it matches Weekly: "M H * * 1,3"
  if (dayOfMonth === "*" && month === "*" && dayOfWeek !== "*") {
    const formattedHour = hour.padStart(2, "0");
    const formattedMin = min.padStart(2, "0");
    const days = dayOfWeek.split(",").map(getDayLabel).join(", ");
    return `${t("schedules.weekly")} (${days}) @ ${formattedHour}:${formattedMin}`;
  }

  // Check if it matches Monthly: "M H D * *"
  if (dayOfMonth !== "*" && month === "*" && dayOfWeek === "*") {
    const formattedHour = hour.padStart(2, "0");
    const formattedMin = min.padStart(2, "0");
    return `${t("schedules.monthly")} (${t("schedules.dayOfMonth")}: ${dayOfMonth}) @ ${formattedHour}:${formattedMin}`;
  }

  return `${t("schedules.cronExpr")}: ${cronStr}`;
}

export function SchedulesPageClient({ initialDatabases, initialSchedules, timezone }: SchedulesPageClientProps) {
  const { t, locale } = useTranslation();
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules);
  const [databases] = useState<Database[]>(initialDatabases);

  // Modal open states
  const [modalOpen, setOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  // Form states
  const [databaseId, setDatabaseId] = useState("");
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [advancedType, setAdvancedType] = useState<"cron" | "daybyday">("cron");
  
  // Simple Mode form states
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [time, setTime] = useState("02:00");
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState("1");

  // Advanced Mode - Custom Cron
  const [rawCron, setRawCron] = useState("0 2 * * *");

  // Advanced Mode - Day by Day settings
  const [dayTimes, setDayTimes] = useState<Record<string, { enabled: boolean; time: string }>>({
    "1": { enabled: false, time: "02:00" },
    "2": { enabled: false, time: "02:00" },
    "3": { enabled: false, time: "02:00" },
    "4": { enabled: false, time: "02:00" },
    "5": { enabled: false, time: "02:00" },
    "6": { enabled: false, time: "02:00" },
    "0": { enabled: false, time: "02:00" },
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Statistics
  const totalSchedules = schedules.length;
  const activeSchedules = schedules.filter(s => s.enabled).length;
  const passiveSchedules = totalSchedules - activeSchedules;

  const resetForm = () => {
    if (editingSchedule) {
      setDatabaseId(editingSchedule.databaseId);
      
      // Parse existing cron expression
      const parts = editingSchedule.cron.trim().split(/\s+/);
      if (parts.length === 5) {
        const [min, hour, dom, mon, dow] = parts;
        const timeVal = `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;

        if (dom === "*" && mon === "*" && dow === "*") {
          setIsAdvanced(false);
          setFrequency("daily");
          setTime(timeVal);
        } else if (dom === "*" && mon === "*" && dow !== "*") {
          setIsAdvanced(false);
          setFrequency("weekly");
          setTime(timeVal);
          setSelectedDays(dow.split(","));
        } else if (dom !== "*" && mon === "*" && dow === "*") {
          setIsAdvanced(false);
          setFrequency("monthly");
          setTime(timeVal);
          setDayOfMonth(dom);
        } else {
          setIsAdvanced(true);
          setAdvancedType("cron");
          setRawCron(editingSchedule.cron);
        }
      } else {
        setIsAdvanced(true);
        setAdvancedType("cron");
        setRawCron(editingSchedule.cron);
      }
    } else {
      setDatabaseId(databases[0]?.id || "");
      setIsAdvanced(false);
      setAdvancedType("cron");
      setFrequency("daily");
      setTime("02:00");
      setSelectedDays([]);
      setDayOfMonth("1");
      setRawCron("0 2 * * *");
      setDayTimes({
        "1": { enabled: false, time: "02:00" },
        "2": { enabled: false, time: "02:00" },
        "3": { enabled: false, time: "02:00" },
        "4": { enabled: false, time: "02:00" },
        "5": { enabled: false, time: "02:00" },
        "6": { enabled: false, time: "02:00" },
        "0": { enabled: false, time: "02:00" },
      });
    }
    setStatus(null);
  };

  const handleOpenModal = (sch: Schedule | null = null) => {
    setEditingSchedule(sch);
    // Timeout to make sure React states align
    setTimeout(() => {
      if (sch) {
        setDatabaseId(sch.databaseId);
        const parts = sch.cron.trim().split(/\s+/);
        if (parts.length === 5) {
          const [min, hour, dom, mon, dow] = parts;
          const timeVal = `${hour.padStart(2, "0")}:${min.padStart(2, "0")}`;

          if (dom === "*" && mon === "*" && dow === "*") {
            setIsAdvanced(false);
            setFrequency("daily");
            setTime(timeVal);
          } else if (dom === "*" && mon === "*" && dow !== "*") {
            setIsAdvanced(false);
            setFrequency("weekly");
            setTime(timeVal);
            setSelectedDays(dow.split(","));
          } else if (dom !== "*" && mon === "*" && dow === "*") {
            setIsAdvanced(false);
            setFrequency("monthly");
            setTime(timeVal);
            setDayOfMonth(dom);
          } else {
            setIsAdvanced(true);
            setAdvancedType("cron");
            setRawCron(sch.cron);
          }
        } else {
          setIsAdvanced(true);
          setAdvancedType("cron");
          setRawCron(sch.cron);
        }
      } else {
        setDatabaseId(databases[0]?.id || "");
        setIsAdvanced(false);
        setAdvancedType("cron");
        setFrequency("daily");
        setTime("02:00");
        setSelectedDays([]);
        setDayOfMonth("1");
        setRawCron("0 2 * * *");
        setDayTimes({
          "1": { enabled: false, time: "02:00" },
          "2": { enabled: false, time: "02:00" },
          "3": { enabled: false, time: "02:00" },
          "4": { enabled: false, time: "02:00" },
          "5": { enabled: false, time: "02:00" },
          "6": { enabled: false, time: "02:00" },
          "0": { enabled: false, time: "02:00" },
        });
      }
      setStatus(null);
      setOpen(true);
    }, 0);
  };

  const handleToggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleToggleDayTime = (day: string) => {
    setDayTimes(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled }
    }));
  };

  const handleDayTimeChange = (day: string, value: string) => {
    setDayTimes(prev => ({
      ...prev,
      [day]: { ...prev[day], time: value }
    }));
  };

  // Toggle active/inactive schedule status directly from card list
  const handleToggleEnabled = async (sch: Schedule) => {
    try {
      const res = await updateScheduleAction(sch.id, sch.cron, !sch.enabled);
      if (res.success) {
        setSchedules(prev => 
          prev.map(s => s.id === sch.id ? { ...s, enabled: !s.enabled } : s)
        );
      }
    } catch (err: any) {
      console.error("Failed to toggle schedule:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("schedules.deleteConfirm"))) return;
    try {
      const res = await deleteScheduleAction(id);
      if (res.success) {
        setSchedules(prev => prev.filter(s => s.id !== id));
      } else {
        alert(res.error || "Failed to delete schedule");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete schedule");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!databaseId) {
      setStatus({ type: "error", text: "Lütfen bir veritabanı seçin." });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      // 1. Determine cron string(s)
      let cronExpressions: string[] = [];

      if (!isAdvanced) {
        // Simple Mode
        const [timeHour, timeMin] = time.split(":");
        const hour = parseInt(timeHour, 10).toString();
        const min = parseInt(timeMin, 10).toString();

        if (frequency === "daily") {
          cronExpressions.push(`${min} ${hour} * * *`);
        } else if (frequency === "weekly") {
          if (selectedDays.length === 0) {
            setStatus({ type: "error", text: "Lütfen en az bir gün seçin." });
            setLoading(false);
            return;
          }
          cronExpressions.push(`${min} ${hour} * * ${selectedDays.sort().join(",")}`);
        } else if (frequency === "monthly") {
          const dom = parseInt(dayOfMonth, 10);
          if (isNaN(dom) || dom < 1 || dom > 31) {
            setStatus({ type: "error", text: "Lütfen 1-31 arasında geçerli bir gün seçin." });
            setLoading(false);
            return;
          }
          cronExpressions.push(`${min} ${hour} ${dom} * *`);
        }
      } else {
        // Advanced Mode
        if (advancedType === "cron") {
          // Custom Cron string
          cronExpressions.push(rawCron.trim());
        } else {
          // Day-by-day customized different times
          const enabledDays = Object.entries(dayTimes).filter(([_, val]) => val.enabled);
          if (enabledDays.length === 0) {
            setStatus({ type: "error", text: "Lütfen en az bir gün seçip saat girin." });
            setLoading(false);
            return;
          }
          
          for (const [day, val] of enabledDays) {
            const [timeHour, timeMin] = val.time.split(":");
            const hour = parseInt(timeHour, 10).toString();
            const min = parseInt(timeMin, 10).toString();
            cronExpressions.push(`${min} ${hour} * * ${day}`);
          }
        }
      }

      // 2. Perform save/update operation
      if (editingSchedule) {
        // Edit mode (always single edit)
        const res = await updateScheduleAction(editingSchedule.id, cronExpressions[0], editingSchedule.enabled);
        if (res.success) {
          setStatus({ type: "success", text: t("schedules.saveSuccess") });
          setTimeout(() => {
            setOpen(false);
            window.location.reload();
          }, 1000);
        } else {
          setStatus({ type: "error", text: `${t("schedules.saveFailed")}: ${res.error}` });
        }
      } else {
        // Create mode (could be batch creation if daybyday is used)
        let successCount = 0;
        let lastError = "";

        for (const cronExpr of cronExpressions) {
          const res = await addScheduleAction(databaseId, cronExpr, true);
          if (res.success) {
            successCount++;
          } else {
            lastError = res.error || "Save error";
          }
        }

        if (successCount > 0) {
          setStatus({ type: "success", text: t("schedules.saveSuccess") });
          setTimeout(() => {
            setOpen(false);
            window.location.reload();
          }, 1000);
        } else {
          setStatus({ type: "error", text: `${t("schedules.saveFailed")}: ${lastError}` });
        }
      }
    } catch (err: any) {
      setStatus({ type: "error", text: err.message || t("schedules.saveFailed") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#090807] text-[#E6E4DD] font-sans">
      
      {/* Header */}
      <header className="h-16 border-b border-[#2b2926] px-8 flex items-center justify-between shrink-0 bg-[#0d0c0b]">
        <div className="flex items-center gap-3">
          <IconClock size={18} className="text-[#55f289]" />
          <h1 className="text-sm font-mono tracking-wider font-bold text-white uppercase">{t("schedules.title")}</h1>
        </div>

        <Dialog open={modalOpen} onOpenChange={setOpen}>
          <Button
            onClick={() => handleOpenModal(null)}
            className="bg-[#1b3224] hover:bg-[#223f2d] text-white border border-[#2b4c37] font-mono text-xs cursor-pointer py-2 px-4 h-auto rounded flex items-center gap-2"
          >
            <IconPlus size={14} />
            {t("schedules.addSchedule")}
          </Button>

          {/* Dialog Width constrained to max-w-[600px] sm:max-w-[600px] explicitly as per AGENTS.md */}
          <DialogContent className="max-w-[600px] sm:max-w-[600px] bg-[#0d0c0b] border-[#2b2926] text-[#E6E4DD] rounded-md font-sans p-6 overflow-y-auto max-h-[90vh]">
            <DialogHeader className="border-b border-[#2b2926] pb-4 mb-4">
              <DialogTitle className="text-sm font-mono tracking-wider text-white uppercase flex items-center gap-2">
                <IconCalendarStats size={16} className="text-[#55f289]" />
                {editingSchedule ? t("schedules.editSchedule") : t("schedules.newScheduleTitle")}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#a09e96] pt-1">
                {t("schedules.newScheduleDesc")}
              </DialogDescription>
            </DialogHeader>

            {status && (
              <div
                className={`p-4 rounded text-xs font-mono border flex items-center gap-3 mb-4 ${
                  status.type === "success"
                    ? "bg-[#132219] border-[#1b3f2a] text-[#55f289]"
                    : "bg-[#2d1210] border-[#4b1b1a] text-[#f25c55]"
                }`}
              >
                {status.type === "success" ? <IconCheck size={16} /> : <IconAlertCircle size={16} />}
                <span>{status.text}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-5">
              
              {/* Database selector */}
              <div className="space-y-2">
                <Label htmlFor="db" className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase">
                  {t("schedules.database")}
                </Label>
                {editingSchedule ? (
                  <div className="h-9 px-3 py-2 bg-[#141210] border border-[#2b2926] rounded text-xs text-white font-mono flex items-center gap-2">
                    <IconDatabase size={14} className="text-[#605e58]" />
                    {editingSchedule.database.name}
                  </div>
                ) : (
                  <Select value={databaseId} onValueChange={setDatabaseId}>
                    <SelectTrigger className="bg-[#141210] border-[#2b2926] text-xs text-white font-mono rounded h-9 w-full">
                      <SelectValue placeholder="Veritabanı seçin" />
                    </SelectTrigger>
                    {/* position="popper" for layout dropdown alignment as per AGENTS.md */}
                    <SelectContent className="bg-[#141210] border-[#2b2926] text-[#E6E4DD]" position="popper">
                      {databases.map(db => (
                        <SelectItem key={db.id} value={db.id} className="hover:bg-[#2b2926] text-xs font-mono cursor-pointer">
                          {db.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Timezone Reference Note */}
              <div className="p-3 bg-[#141210] border border-[#2b2926] rounded text-[10px] font-mono text-[#a09e96] flex items-start gap-2.5">
                <IconAlertCircle size={14} className="text-[#55f289] shrink-0 mt-0.5" />
                <div>
                  <span className="text-white uppercase font-bold block mb-0.5">{t("schedules.systemTimezone")}: {timezone}</span>
                  <span>{t("schedules.timezoneDesc")}</span>
                </div>
              </div>

              {/* Advanced Mode Toggle Trigger */}
              <div className="flex items-center justify-between border-t border-b border-[#2b2926] py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-mono text-white tracking-wider font-bold">GELİŞMİŞ SEÇENEKLER</span>
                  <span className="text-[10px] text-[#605e58]">Günlük detaylı saat ayarları veya özel Cron ifadeleri</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdvanced(!isAdvanced)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isAdvanced ? "bg-[#1b3224]" : "bg-[#2b2926]"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isAdvanced ? "translate-x-4 bg-[#55f289]" : "translate-x-0 bg-[#a09e96]"
                    }`}
                  />
                </button>
              </div>

              {/* Form Content depending on Advanced Mode */}
              {!isAdvanced ? (
                // Simple Mode Forms
                <div className="space-y-4 pt-1">
                  
                  {/* Frequency selection */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase block">
                      {t("schedules.frequency")}
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["daily", "weekly", "monthly"] as const).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFrequency(type)}
                          className={`py-2 px-3 border text-xs font-mono rounded cursor-pointer transition-all ${
                            frequency === type
                              ? "bg-[#1b3224]/30 border-[#55f289] text-white font-bold"
                              : "bg-[#141210] border-[#2b2926] text-[#a09e96] hover:bg-[#1a1816]"
                          }`}
                        >
                          {t(`schedules.${type}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Weekly Days selection */}
                  {frequency === "weekly" && (
                    <div className="space-y-2 border border-[#2b2926] p-4 bg-[#141210] rounded">
                      <Label className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase block mb-1">
                        {t("schedules.days")}
                      </Label>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {DAYS_OF_WEEK.map(day => {
                          const isSelected = selectedDays.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              type="button"
                              onClick={() => handleToggleDay(day.value)}
                              className={`py-1.5 border text-[10px] font-mono rounded cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-[#1b3224] border-[#2b4c37] text-[#55f289]"
                                  : "bg-[#0d0c0b] border-[#2b2926] text-[#a09e96] hover:bg-[#141210]"
                              }`}
                            >
                              {locale === "tr" ? day.labelTr.substring(0, 3) : day.labelEn.substring(0, 3)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Monthly Day of Month selection */}
                  {frequency === "monthly" && (
                    <div className="space-y-2 border border-[#2b2926] p-4 bg-[#141210] rounded">
                      <Label className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase block">
                        {t("schedules.dayOfMonth")}
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min="1"
                          max="31"
                          value={dayOfMonth}
                          onChange={(e) => setDayOfMonth(e.target.value)}
                          className="bg-[#0d0c0b] border-[#2b2926] text-xs font-mono text-white rounded w-24 h-9"
                          required
                        />
                        <span className="text-[10px] font-mono text-[#605e58]">
                          (1 - 31)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Backup Execution Time */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase block">
                      {t("schedules.time")}
                    </Label>
                    <Input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="bg-[#141210] border-[#2b2926] text-xs font-mono text-white rounded w-32 h-9"
                      required
                    />
                  </div>

                </div>
              ) : (
                // Advanced Mode Forms
                <div className="space-y-5 pt-1">
                  
                  {/* Advanced settings category chooser */}
                  <div className="flex border-b border-[#2b2926] gap-4 mb-2">
                    <button
                      type="button"
                      onClick={() => setAdvancedType("cron")}
                      className={`pb-2 border-b-2 text-xs font-mono tracking-wider uppercase cursor-pointer transition-all ${
                        advancedType === "cron"
                          ? "border-[#55f289] text-white font-bold"
                          : "border-transparent text-[#a09e96] hover:text-white"
                      }`}
                    >
                      Özel Cron
                    </button>
                    {!editingSchedule && (
                      <button
                        type="button"
                        onClick={() => setAdvancedType("daybyday")}
                        className={`pb-2 border-b-2 text-xs font-mono tracking-wider uppercase cursor-pointer transition-all ${
                          advancedType === "daybyday"
                            ? "border-[#55f289] text-white font-bold"
                            : "border-transparent text-[#a09e96] hover:text-white"
                        }`}
                      >
                        Gün Gün Saat Ayarı
                      </button>
                    )}
                  </div>

                  {advancedType === "cron" ? (
                    /* Option A: Raw Cron Expression string input */
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="cron" className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase block">
                          {t("schedules.cronExpr")}
                        </Label>
                        <Input
                          id="cron"
                          value={rawCron}
                          onChange={(e) => setRawCron(e.target.value)}
                          placeholder="e.g. 0 2 * * *"
                          className="bg-[#141210] border-[#2b2926] text-xs font-mono text-white rounded h-9"
                          required
                        />
                      </div>
                      
                      <div className="p-3 bg-[#141210] border border-[#2b2926] rounded text-[10px] font-mono text-[#a09e96] leading-relaxed space-y-1.5">
                        <span className="text-white font-bold uppercase block">CRON REFERANS REHBERİ:</span>
                        <div className="grid grid-cols-5 text-[#605e58] border-b border-[#2b2926] pb-1 mb-1.5">
                          <div>dakika</div>
                          <div>saat</div>
                          <div>gün (ay)</div>
                          <div>ay</div>
                          <div>gün (hafta)</div>
                        </div>
                        <div className="grid grid-cols-5 font-bold text-[#a09e96]">
                          <div>0-59</div>
                          <div>0-23</div>
                          <div>1-31</div>
                          <div>1-12</div>
                          <div>0-6</div>
                        </div>
                        <p className="pt-2 text-[9px] text-[#605e58]">
                          * Not: Pazar günü "0" veya "7" ile temsil edilir.
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Option B: Day-by-Day Different Hours setting */
                    <div className="space-y-3 border border-[#2b2926] p-4 bg-[#141210] rounded">
                      <Label className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase block mb-2">
                        Hangi Günlerde, Saat Kaçta Yedek Alınsın?
                      </Label>
                      
                      <div className="space-y-3 pt-1">
                        {DAYS_OF_WEEK.map(day => {
                          const config = dayTimes[day.value];
                          return (
                            <div key={day.value} className="flex items-center justify-between border-b border-[#2b2926]/40 pb-2.5 last:border-b-0 last:pb-0">
                              <label className="flex items-center gap-3 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={config.enabled}
                                  onChange={() => handleToggleDayTime(day.value)}
                                  className="h-4 w-4 bg-[#0d0c0b] border-[#2b2926] text-[#1b3224] focus:ring-0 focus:ring-offset-0 rounded cursor-pointer"
                                />
                                <span className={`text-xs font-mono tracking-wider ${config.enabled ? "text-white font-bold" : "text-[#605e58]"}`}>
                                  {locale === "tr" ? day.labelTr : day.labelEn}
                                </span>
                              </label>

                              {config.enabled && (
                                <Input
                                  type="time"
                                  value={config.time}
                                  onChange={(e) => handleDayTimeChange(day.value, e.target.value)}
                                  className="bg-[#0d0c0b] border-[#2b2926] text-xs font-mono text-white rounded w-32 h-8 py-0.5"
                                  required
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Modal controls */}
              <div className="flex justify-end gap-3 border-t border-[#2b2926] pt-4 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="border-[#2b2926] text-[#E6E4DD] hover:bg-[#1c1a17] hover:text-white font-mono text-xs cursor-pointer rounded px-4 h-9"
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#1b3224] hover:bg-[#223f2d] text-white border border-[#2b4c37] font-mono text-xs cursor-pointer rounded px-6 h-9 flex items-center justify-center"
                >
                  {loading ? t("common.loading") : t("common.save")}
                </Button>
              </div>

            </form>
          </DialogContent>
        </Dialog>
      </header>

      {/* Main Content Area */}
      <div className="p-8 max-w-5xl w-full mx-auto space-y-6 flex-1">
        
        {/* Statistics Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md font-sans">
            <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase">TOPLAM ZAMANLAMA</span>
              <IconClock size={16} className="text-[#a09e96]" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-mono font-bold text-white">{totalSchedules}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md font-sans border-l-2 border-l-[#55f289]">
            <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase">{t("schedules.activeSchedules")}</span>
              <IconCheck size={16} className="text-[#55f289]" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-mono font-bold text-[#55f289]">{activeSchedules}</div>
            </CardContent>
          </Card>

          <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md font-sans border-l-2 border-l-[#f25c55]/60">
            <CardHeader className="p-4 flex flex-row items-center justify-between pb-2">
              <span className="text-[10px] font-mono tracking-wider text-[#a09e96] uppercase">PASİF ZAMANLAMA</span>
              <IconAlertCircle size={16} className="text-[#f25c55]/60" />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-mono font-bold text-[#f25c55]/80">{passiveSchedules}</div>
            </CardContent>
          </Card>
        </div>

        {/* Schedule List */}
        <Card className="bg-[#0d0c0b] border-[#2b2926] rounded-md font-sans">
          <CardHeader className="p-6 border-b border-[#2b2926]">
            <CardTitle className="text-sm font-mono tracking-wider text-white uppercase flex items-center gap-2">
              <IconCalendar size={16} className="text-[#55f289]" />
              ZAMANLANMIŞ İŞ LİSTESİ
            </CardTitle>
            <CardDescription className="text-xs text-[#a09e96] pt-1 leading-relaxed">
              Otomatik yedeklemelerinizi yönetin, düzenleyin ve aktif/pasif duruma getirin.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {schedules.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-[#605e58]">
                {t("schedules.noSchedules")}
              </div>
            ) : (
              <div className="divide-y divide-[#2b2926]/60">
                {schedules.map((sch) => (
                  <div key={sch.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#141210]/40 transition-colors">
                    
                    {/* Connection and expression descriptions */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <IconDatabase size={14} className="text-[#605e58]" />
                        <span className="text-xs font-mono font-bold text-white">{sch.database.name}</span>
                      </div>
                      
                      <div className="text-[11px] text-[#a09e96] font-mono pt-0.5 leading-relaxed flex items-center gap-2">
                        <span>{getCronDescription(sch.cron, t, locale)}</span>
                        <span className="text-[#605e58] font-bold text-[9px] px-1 bg-[#1c1a17] border border-[#2b2926] rounded uppercase">
                          {sch.cron}
                        </span>
                      </div>
                    </div>

                    {/* Right side controls (Active switch + Actions) */}
                    <div className="flex items-center gap-5 justify-end">
                      
                      {/* Toggle status switch */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-[#605e58]">
                          {sch.enabled ? t("schedules.enabled") : t("schedules.disabled")}
                        </span>
                        <button
                          onClick={() => handleToggleEnabled(sch)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            sch.enabled ? "bg-[#1b3224]" : "bg-[#2b2926]"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              sch.enabled ? "translate-x-4 bg-[#55f289]" : "translate-x-0 bg-[#a09e96]"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="h-4 w-[1px] bg-[#2b2926]" />

                      {/* Edit / Delete action buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => handleOpenModal(sch)}
                          className="h-8 w-8 p-0 border border-transparent hover:border-[#2b2926] hover:bg-[#141210] text-[#a09e96] hover:text-white rounded cursor-pointer flex items-center justify-center"
                          title={t("common.edit")}
                        >
                          <IconEdit size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => handleDelete(sch.id)}
                          className="h-8 w-8 p-0 border border-transparent hover:border-[#2b2926] hover:bg-[#2d1210]/30 text-[#a09e96] hover:text-[#f25c55] rounded cursor-pointer flex items-center justify-center"
                          title={t("common.delete")}
                        >
                          <IconTrash size={14} />
                        </Button>
                      </div>

                    </div>

                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
