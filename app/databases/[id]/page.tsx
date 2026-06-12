import React from "react";
import Link from "next/link";
import { cookies } from "next/headers";
import { prisma } from "../../../lib/db";
import { decrypt } from "../../../lib/encryption";
import { getT, Locale } from "../../../lib/i18n";
import { fetchPostgresTables, fetchTableData } from "../../../lib/db-client";
import { 
  IconDatabase, 
  IconTable, 
  IconArrowLeft, 
  IconChevronLeft, 
  IconChevronRight, 
  IconAlertCircle,
  IconTableShare
} from "@tabler/icons-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { DatabaseTypeMark } from "../../../components/database-type-mark";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../../components/ui/table";

interface DatabaseExplorerPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ table?: string; page?: string; pageSize?: string }>;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export default async function DatabaseExplorerPage({ params, searchParams }: DatabaseExplorerPageProps) {
  const { id } = await params;
  const { table: activeTable, page: pageStr, pageSize: pageSizeStr } = await searchParams;
  
  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as Locale) || "tr";
  const t = getT(locale);

  const currentPage = pageStr ? parseInt(pageStr, 10) : 1;
  const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 50;

  // 1. Fetch database configuration from Prisma
  const db = await prisma.databaseConnection.findUnique({
    where: { id },
  });

  if (!db) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#090807] text-white">
        <IconAlertCircle size={48} className="text-[#f25c55] mb-4" />
        <h2 className="text-lg font-mono font-bold">Veritabanı Bulunamadı</h2>
        <p className="text-xs text-[#a09e96] mt-2">İstenen veritabanı bağlantısı sistemde mevcut değil.</p>
        <Link href="/" className="mt-4">
          <Button variant="outline" className="border-[#2b2926] text-xs font-mono">
            {t("common.cancel")}
          </Button>
        </Link>
      </div>
    );
  }

  const decryptedPassword = decrypt(db.password);
  
  let tables: string[] = [];
  let errorMsg = "";
  
  // 2. Fetch list of tables from PostgreSQL
  try {
    tables = await fetchPostgresTables({
      host: db.host,
      port: db.port,
      user: db.user,
      password: decryptedPassword,
      database: db.database,
      ssl: db.ssl,
    });
  } catch (err: any) {
    errorMsg = err.message || "Veritabanı bağlantısı kurulamadı.";
  }

  // 3. Fetch active table data if a table is selected
  let tableData: { columns: string[]; rows: any[]; totalCount: number } | null = null;
  let queryError = "";

  if (activeTable && tables.includes(activeTable)) {
    try {
      tableData = await fetchTableData(
        {
          host: db.host,
          port: db.port,
          user: db.user,
          password: decryptedPassword,
          database: db.database,
          ssl: db.ssl,
        },
        activeTable,
        currentPage,
        pageSize,
        true
      );
    } catch (err: any) {
      queryError = err.message || "Veri yüklenirken bir hata oluştu.";
    }
  }

  const totalPages = tableData ? Math.ceil(tableData.totalCount / pageSize) : 0;

  return (
    <div className="flex-1 flex overflow-hidden bg-[#090807] text-[#E6E4DD] font-sans">
      
      {/* Left Sidebar: Tables List */}
      <div className="w-64 border-r border-[#2b2926] bg-[#0d0c0b] flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-[#2b2926] flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-1 text-[10px] font-mono text-[#605e58] hover:text-white transition-colors">
            <IconArrowLeft size={10} />
            {t("common.cancel").toUpperCase()}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <IconDatabase size={16} className="text-[#55f289]" />
            <DatabaseTypeMark />
            <h2 className="min-w-0 truncate text-xs font-mono font-bold uppercase text-white" title={db.name}>
              {db.name}
            </h2>
          </div>
          <span className="text-[10px] font-mono text-[#605e58] truncate">{db.host}/{db.database}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <span className="px-3 py-1.5 block text-[9px] font-mono text-[#605e58] tracking-widest uppercase">
            {t("database.tables").toUpperCase()} ({tables.length})
          </span>
          {errorMsg ? (
            <div className="p-3 text-[11px] font-mono text-[#f25c55] bg-[#2d1210]/30 border border-[#4b1b1a]/50 rounded">
              {errorMsg}
            </div>
          ) : tables.length === 0 ? (
            <div className="p-3 text-[11px] font-mono text-[#605e58]">
              {t("database.noTables")}
            </div>
          ) : (
            tables.map((tbl) => {
              const isSelected = activeTable === tbl;
              return (
                <Link
                  key={tbl}
                  href={`/databases/${id}?table=${tbl}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-mono truncate transition-all ${
                    isSelected
                      ? "bg-[#1b3224]/30 text-white border-l-2 border-[#55f289] font-bold"
                      : "hover:bg-[#141210] text-[#a09e96] hover:text-[#E6E4DD]"
                  }`}
                >
                  <IconTable size={12} className={isSelected ? "text-[#55f289]" : "text-[#605e58]"} />
                  {tbl}
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Right Content Area: Table Data Grid Explorer */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#090807]">
        {activeTable ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Table Header Details */}
            <div className="h-16 border-b border-[#2b2926] bg-[#0d0c0b] px-8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3 font-mono">
                <IconTableShare size={18} className="text-[#55f289]" />
                <h1 className="text-xs font-bold text-white uppercase">{activeTable}</h1>
                {tableData && (
                  <Badge variant="outline" className="bg-[#1c1a17] border-[#2b2926] text-[#a09e96] text-[9px] font-mono py-0.5">
                    {t("database.rowsCount")} {tableData.totalCount}
                  </Badge>
                )}
              </div>

              {/* Pagination controls */}
              {tableData && (
                <div className="flex items-center gap-4 font-mono text-xs text-[#a09e96]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-[#605e58] tracking-wider uppercase">{t("database.rowsPerPage")}</span>
                    {PAGE_SIZE_OPTIONS.map((s) => {
                      const isActive = pageSize === s;
                      return (
                        <Link
                          key={s}
                          href={`/databases/${id}?table=${activeTable}&pageSize=${s}&page=1`}
                          className={`px-2 py-0.5 rounded text-[10px] transition-all ${
                            isActive
                              ? "bg-[#1b3224]/30 text-[#55f289] font-bold"
                              : "text-[#605e58] hover:text-[#a09e96] hover:bg-[#141210]"
                          }`}
                        >
                          {s}
                        </Link>
                      );
                    })}
                  </div>
                  {totalPages > 1 && (
                    <>
                      <span>{currentPage} / {totalPages}</span>
                      <div className="flex gap-1.5">
                        <Link
                          href={currentPage > 1 ? `/databases/${id}?table=${activeTable}&page=${currentPage - 1}&pageSize=${pageSize}` : "#"}
                          className={currentPage === 1 ? "pointer-events-none opacity-40" : ""}
                        >
                          <Button size="icon" variant="outline" className="h-7 w-7 border-[#2b2926] hover:bg-[#1c1a17] rounded cursor-pointer">
                            <IconChevronLeft size={14} />
                          </Button>
                        </Link>
                        <Link
                          href={currentPage < totalPages ? `/databases/${id}?table=${activeTable}&page=${currentPage + 1}&pageSize=${pageSize}` : "#"}
                          className={currentPage === totalPages ? "pointer-events-none opacity-40" : ""}
                        >
                          <Button size="icon" variant="outline" className="h-7 w-7 border-[#2b2926] hover:bg-[#1c1a17] rounded cursor-pointer">
                            <IconChevronRight size={14} />
                          </Button>
                        </Link>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Table Viewer Content */}
            <div className="flex-1 overflow-auto p-8">
              {queryError ? (
                <div className="p-4 bg-[#2d1210] border border-[#4b1b1a] rounded text-xs font-mono text-[#f25c55] flex items-center gap-2">
                  <IconAlertCircle size={16} />
                  <span>{t("database.queryError")}{queryError}</span>
                </div>
              ) : !tableData || tableData.rows.length === 0 ? (
                <div className="h-64 border border-dashed border-[#2b2926] rounded flex flex-col items-center justify-center text-[#605e58] font-mono text-xs">
                  <IconTable size={32} className="mb-2 text-[#2b2926]" />
                  {t("database.noData")}
                </div>
              ) : (
                <div className="border border-[#2b2926] rounded-md overflow-x-auto bg-[#0d0c0b]">
                  <Table className="min-w-max">
                    <TableHeader className="bg-[#141210] border-b border-[#2b2926]">
                      <TableRow className="border-b border-[#2b2926] hover:bg-[#141210]">
                        {tableData.columns.map((col) => (
                          <TableHead key={col} className="font-mono text-[10px] tracking-wider text-[#605e58] uppercase py-3.5 px-4">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableData.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex} className="border-b border-[#2b2926]/40 hover:bg-[#141210]/40">
                          {tableData.columns.map((col) => {
                            const val = row[col];
                            let displayVal = "";
                            
                            if (val === null || val === undefined) {
                              displayVal = "NULL";
                            } else if (typeof val === "object") {
                              displayVal = JSON.stringify(val);
                            } else {
                              displayVal = String(val);
                            }

                            const isNull = val === null || val === undefined;

                            return (
                              <TableCell 
                                key={col} 
                                className={`font-mono text-xs max-w-62.5 truncate py-3 px-4 ${
                                  isNull ? "text-[#605e58] italic" : "text-[#E6E4DD]"
                                }`}
                                title={displayVal}
                              >
                                {displayVal}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Empty state: No table selected */
          <div className="flex-1 flex flex-col items-center justify-center p-8 font-mono text-xs text-[#605e58]">
            <div className="h-14 w-14 bg-[#141210] border border-[#2b2926] rounded-full flex items-center justify-center text-[#a09e96] mb-4">
              <IconTable size={24} />
            </div>
            <h3 className="font-bold text-white text-sm uppercase">{t("database.explorerTitle")}</h3>
            <p className="mt-1.5 text-center max-w-75 leading-relaxed">
              {t("database.explorerDesc")} Sol menüden incelemek istediğiniz bir tabloyu seçin.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
