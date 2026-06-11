"use client";

import React, { useState } from "react";
import { useTranslation } from "./i18n-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { addDatabaseAction, testConnectionAction } from "../app/actions";
import { IconDatabasePlus } from "@tabler/icons-react";

interface DatabaseModalProps {
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

export function DatabaseModal({ onSuccess, trigger }: DatabaseModalProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"url" | "fields">("url");
  const [connectionString, setConnectionString] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("5432");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [database, setDatabase] = useState("");
  const [ssl, setSsl] = useState("prefer");
  const [environment, setEnvironment] = useState("production");
  const [labels, setLabels] = useState("");

  // Loading/Status states
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const resetForm = () => {
    setName("");
    setConnectionString("");
    setHost("");
    setPort("5432");
    setUser("");
    setPassword("");
    setDatabase("");
    setSsl("prefer");
    setEnvironment("production");
    setLabels("");
    setMessage(null);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      const res = await testConnectionAction({
        mode,
        connectionString,
        host,
        port: port ? parseInt(port, 10) : undefined,
        user,
        password,
        database,
        ssl,
      });

      if (res.success) {
        setMessage({ type: "success", text: t("database.testSuccess") });
      } else {
        setMessage({ type: "error", text: `${t("database.testFailed")}${res.error}` });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to test connection" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setMessage({ type: "error", text: "Kısa ad (Short name) zorunludur." });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await addDatabaseAction({
        name,
        mode,
        connectionString,
        host,
        port: port ? parseInt(port, 10) : undefined,
        user,
        password,
        database,
        ssl,
        environment,
        labels,
      });

      if (res.success) {
        setMessage({ type: "success", text: t("database.saveSuccess") });
        setTimeout(() => {
          setOpen(false);
          resetForm();
          if (onSuccess) onSuccess();
        }, 1000);
      } else {
        setMessage({ type: "error", text: `${t("database.saveFailed")}: ${res.error}` });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save database" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-[#1b3224] hover:bg-[#223f2d] text-white border border-[#2b4c37] font-mono text-xs flex items-center gap-1.5 cursor-pointer">
            <IconDatabasePlus size={14} />
            + {t("database.addDb")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[600px] sm:max-w-[600px] w-full bg-[#0d0c0b] text-[#E6E4DD] border border-[#2b2926] p-0 overflow-hidden rounded-md shadow-2xl font-sans">
        <DialogHeader className="p-6 border-b border-[#2b2926]">
          <DialogTitle className="text-sm font-mono tracking-wider uppercase text-white">
            {t("database.newDbTitle")}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#a09e96] pt-1.5">
            {t("database.newDbDesc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#1c1a17] border border-[#2b2926] p-0.5 rounded">
              <TabsTrigger 
                value="url" 
                className="py-1.5 text-xs font-mono font-semibold text-[#a09e96] data-[state=active]:bg-[#2c2925] data-[state=active]:text-white cursor-pointer rounded"
              >
                {t("database.urlMode")}
              </TabsTrigger>
              <TabsTrigger 
                value="fields" 
                className="py-1.5 text-xs font-mono font-semibold text-[#a09e96] data-[state=active]:bg-[#2c2925] data-[state=active]:text-white cursor-pointer rounded"
              >
                {t("database.fieldMode")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="mt-5 space-y-5 pt-1">
              <div className="space-y-2">
                <Label htmlFor="url" className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96] block mb-1">
                  {t("database.connAddress")}
                </Label>
                <Input
                  id="url"
                  placeholder="postgresql://user:password@host:5432/database"
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  className="bg-[#141210] border-[#2b2926] focus:border-[#d2541c] focus:ring-1 focus:ring-[#d2541c] text-sm text-white font-mono rounded h-9 w-full"
                  required={mode === "url"}
                />
              </div>
            </TabsContent>

            <TabsContent value="fields" className="mt-5 space-y-5">
              <div className="grid grid-cols-3 gap-5">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="host" className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96] block mb-1">
                    {t("database.host")}
                  </Label>
                  <Input
                    id="host"
                    placeholder="localhost"
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="bg-[#141210] border-[#2b2926] text-sm text-white font-mono rounded h-9 w-full"
                    required={mode === "fields"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port" className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96] block mb-1">
                    {t("database.port")}
                  </Label>
                  <Input
                    id="port"
                    placeholder="5432"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="bg-[#141210] border-[#2b2926] text-sm text-white font-mono rounded h-9 w-full"
                    required={mode === "fields"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="user" className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96] block mb-1">
                    {t("database.user")}
                  </Label>
                  <Input
                    id="user"
                    placeholder="postgres"
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    className="bg-[#141210] border-[#2b2926] text-sm text-white font-mono rounded h-9 w-full"
                    required={mode === "fields"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96] block mb-1">
                    {t("database.password")}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-[#141210] border-[#2b2926] text-sm text-white font-mono rounded h-9 w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="database" className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96] block mb-1">
                  {t("database.dbName")}
                </Label>
                <Input
                  id="database"
                  placeholder="my_database"
                  value={database}
                  onChange={(e) => setDatabase(e.target.value)}
                  className="bg-[#141210] border-[#2b2926] text-sm text-white font-mono rounded h-9 w-full"
                  required={mode === "fields"}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96] block mb-1">
                {t("database.shortName")}
              </Label>
              <Input
                id="name"
                placeholder="e.g. core-db"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-[#141210] border-[#2b2926] text-sm text-white font-mono rounded h-9 w-full"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ssl" className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96] block mb-1">
                {t("database.sslMode")}
              </Label>
              <Select value={ssl} onValueChange={setSsl}>
                <SelectTrigger className="bg-[#141210] border-[#2b2926] text-sm text-white font-mono rounded h-9 w-full">
                  <SelectValue placeholder="Select SSL Mode" />
                </SelectTrigger>
                <SelectContent className="bg-[#141210] border-[#2b2926] text-[#E6E4DD]">
                  <SelectItem value="prefer" className="hover:bg-[#2b2926]">prefer</SelectItem>
                  <SelectItem value="require" className="hover:bg-[#2b2926]">require</SelectItem>
                  <SelectItem value="disable" className="hover:bg-[#2b2926]">disable</SelectItem>
                  <SelectItem value="allow" className="hover:bg-[#2b2926]">allow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="environment" className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96] block mb-1">
                {t("database.environment")}
              </Label>
              <Select value={environment} onValueChange={setEnvironment}>
                <SelectTrigger className="bg-[#141210] border-[#2b2926] text-sm text-white font-mono rounded h-9 w-full">
                  <SelectValue placeholder="Ortam seçin" />
                </SelectTrigger>
                <SelectContent className="bg-[#141210] border-[#2b2926] text-[#E6E4DD]">
                  <SelectItem value="production">{t("database.envProduction")}</SelectItem>
                  <SelectItem value="staging">{t("database.envStaging")}</SelectItem>
                  <SelectItem value="development">{t("database.envDevelopment")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="labels" className="text-[10px] font-mono tracking-wider uppercase text-[#a09e96] block mb-1">
                {t("database.labels")}
              </Label>
              <Input
                id="labels"
                placeholder={t("database.labelsPlaceholder")}
                value={labels}
                onChange={(e) => setLabels(e.target.value)}
                className="bg-[#141210] border-[#2b2926] text-sm text-white font-mono rounded h-9 w-full"
              />
            </div>
          </div>

          {message && (
            <div
              className={`p-3 rounded text-xs font-mono border ${
                message.type === "success"
                  ? "bg-[#132219] border-[#1b3f2a] text-[#55f289]"
                  : "bg-[#2d1210] border-[#4b1b1a] text-[#f25c55]"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-[#2b2926]">
            <Button
              type="button"
              variant="outline"
              disabled={testing || saving}
              onClick={handleTestConnection}
              className="border-[#2b2926] text-[#E6E4DD] hover:bg-[#1c1a17] hover:text-white font-mono text-xs cursor-pointer rounded"
            >
              {testing ? t("common.testing") : t("common.testConnection")}
            </Button>
            <Button
              type="submit"
              disabled={testing || saving}
              className="bg-[#1b3224] hover:bg-[#223f2d] text-white border border-[#2b4c37] font-mono text-xs cursor-pointer rounded"
            >
              {saving ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
