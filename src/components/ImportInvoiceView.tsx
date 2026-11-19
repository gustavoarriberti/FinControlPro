"use client";

import React, { useState } from "react";
import {
  Category,
  CreditCard,
  ExtractedTransactionDraft,
  ParsedInvoicePayload,
} from "@/lib/types";
import { formatCurrency, formatReferenceMonth } from "@/lib/utils";
import {
  UploadCloud,
  Sparkles,
  FileText,
  CheckCircle2,
  Lock,
  Users,
  Calendar,
  ArrowRight,
  FileSpreadsheet,
  ExternalLink,
  Layers,
} from "lucide-react";

interface ImportInvoiceViewProps {
  creditCards: CreditCard[];
  categories: Category[];
  selectedMonth: string;
  activeUserId: string;
  onImportSuccess: () => Promise<void>;
}

export function ImportInvoiceView({
  creditCards,
  categories,
  selectedMonth,
  activeUserId,
  onImportSuccess,
}: ImportInvoiceViewProps) {
  const [targetCardId, setTargetCardId] = useState<string>(
    creditCards[0]?.id || ""
  );
  const [targetMonth, setTargetMonth] = useState<string>(selectedMonth);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedInvoicePayload | null>(
    null
  );
  const [items, setItems] = useState<ExtractedTransactionDraft[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResultBanner, setImportResultBanner] = useState<string | null>(
    null
  );

  async function handleFileUpload(file: File) {
    setErrorMsg(null);
    setImportResultBanner(null);
    setIsParsing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("referenceMonth", targetMonth);

      const res = await fetch("/api/invoices/parse", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Falha ao processar fatura");
      }

      setParsedData(data.parsed);
      setItems(data.parsed.items || []);
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setIsParsing(false);
    }
  }

  async function handleLoadSample(format: "OFX" | "CSV" | "PDF") {
    setErrorMsg(null);
    setImportResultBanner(null);

    if (format === "OFX") {
      const resp = await fetch("/samples/fatura_nubank_exemplo.ofx");
      const text = await resp.text();
      const file = new File([text], "fatura_nubank_nov2026.ofx", {
        type: "application/x-ofx",
      });
      await handleFileUpload(file);
    } else if (format === "CSV") {
      const resp = await fetch("/samples/fatura_itau_exemplo.csv");
      const text = await resp.text();
      const file = new File([text], "fatura_itau_nov2026.csv", {
        type: "text/csv",
      });
      await handleFileUpload(file);
    } else {
      const pdfSampleContent = `%PDF-1.4
Fatura Cartao Nubank Ultravioleta - Referencia ${targetMonth}
03/11/2026 Amazon.com.br *Echo Show 01/04 R$ 215,00
06/11/2026 Supermercado Pao de Acucar R$ 742,80
09/11/2026 iFood *Restaurante R$ 118,90
13/11/2026 Posto Shell Combustivel R$ 260,00
15/11/2026 Farmacia Drogasil R$ 94,50
16/11/2026 Apple.com/bill iCloud+ R$ 14,90`;

      const file = new File([pdfSampleContent], `fatura_cartao_${targetMonth}.pdf`, {
        type: "application/pdf",
      });
      await handleFileUpload(file);
    }
  }

  function updateItem(
    tempId: string,
    patch: Partial<ExtractedTransactionDraft>
  ) {
    setItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, ...patch } : item))
    );
  }

  async function handleConfirmImport() {
    if (!parsedData || !targetCardId) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/invoices/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creditCardId: targetCardId,
          referenceMonth: targetMonth,
          fileName: parsedData.fileName,
          fileUrl: parsedData.fileUrl,
          fileFormat: parsedData.fileFormat,
          userId: activeUserId,
          items,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao gravar lançamentos");
      }

      setImportResultBanner(
        `Importação concluída! ${data.importedCount} lançamentos gravados na fatura de ${formatReferenceMonth(
          targetMonth
        )}${
          data.projectedCount > 0
            ? ` e ${data.projectedCount} parcelas futuras projetadas automaticamente nos meses seguintes.`
            : "."
        }`
      );
      setParsedData(null);
      setItems([]);
      await onImportSuccess();
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setIsSaving(false);
    }
  }

  const selectedItems = items.filter((i) => i.selected);
  const selectedSum = selectedItems.reduce((acc, i) => acc + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho e configuração de destino */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Extração Híbrida (IA Gemini para PDF + Parser Nativo OFX/CSV)
            </span>
            <h2 className="mt-2 text-xl font-bold text-slate-900">
              Importar e Conciliar Fatura de Cartão
            </h2>
            <p className="text-sm text-slate-500">
              Envie o PDF, OFX ou CSV da fatura. O sistema armazena o arquivo original, extrai os
              lançamentos, identifica parcelamentos (ex: 1/6) e projeta as parcelas futuras.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600">
                Cartão de Destino
              </label>
              <select
                value={targetCardId}
                onChange={(e) => setTargetCardId(e.target.value)}
                className="mt-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (••• {c.lastFourDigits})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600">
                Mês da Fatura
              </label>
              <input
                type="month"
                value={targetMonth}
                onChange={(e) => setTargetMonth(e.target.value)}
                className="mt-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {importResultBanner && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <span>{importResultBanner}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Área de Upload + Botões de Exemplo Rápido */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <label className="col-span-1 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50/40 p-8 text-center transition hover:border-blue-500 hover:bg-blue-50/80 lg:col-span-2">
            <UploadCloud className="h-10 w-10 text-blue-600" />
            <span className="mt-3 text-base font-semibold text-slate-800">
              {isParsing
                ? "Analisando documento e extraindo lançamentos..."
                : "Clique para selecionar ou arraste o arquivo da fatura"}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Suporta Faturas em PDF (qualquer banco brasileiro), arquivos .OFX e .CSV
            </span>
            <input
              type="file"
              accept=".pdf,.ofx,.csv"
              className="hidden"
              disabled={isParsing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
          </label>

          <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-800">
                Testar Extração Instantânea
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Carregue uma fatura simulada com 1 clique para testar a conciliação, categorização
                automática e projeção de parcelas:
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                disabled={isParsing}
                onClick={() => handleLoadSample("PDF")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-rose-500" />
                  Simular Fatura em PDF (IA / OCR)
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={isParsing}
                onClick={() => handleLoadSample("OFX")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600"
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-purple-600" />
                  Simular Extrato Nubank (.OFX)
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={isParsing}
                onClick={() => handleLoadSample("CSV")}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600"
              >
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  Simular Fatura Itaú (.CSV)
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tela de Conciliação e Revisão antes de Salvar */}
      {parsedData && (
        <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-md">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white">
                  {parsedData.fileFormat}
                </span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                  Motor: {parsedData.extractionEngine}
                </span>
                {parsedData.fileUrl && (
                  <a
                    href={parsedData.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Arquivo Original Arquivado ({parsedData.fileName})
                  </a>
                )}
              </div>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                Conciliação Prévias de Lançamentos ({selectedItems.length} selecionados)
              </h3>
              <p className="text-xs text-slate-500">
                Revise categorias, valores, parcelas e visibilidade (Compartilhado vs Privado)
                antes de confirmar a gravação na fatura.
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="block text-xs text-slate-500">
                  Total Selecionado para Importar
                </span>
                <span className="text-xl font-extrabold text-slate-900">
                  {formatCurrency(selectedSum)}
                </span>
              </div>
              <button
                type="button"
                disabled={isSaving || selectedItems.length === 0}
                onClick={handleConfirmImport}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {isSaving ? "Gravando..." : "Confirmar e Salvar Fatura"}
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500">
                  <th className="py-3 pr-2">Incluir</th>
                  <th className="px-2 py-3">Data</th>
                  <th className="px-2 py-3">Estabelecimento / Descrição</th>
                  <th className="px-2 py-3">Categoria</th>
                  <th className="px-2 py-3">Parcela</th>
                  <th className="px-2 py-3">Projetar Futuras?</th>
                  <th className="px-2 py-3">Privacidade</th>
                  <th className="px-2 py-3 text-right">Valor Parcela (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr
                    key={item.tempId}
                    className={!item.selected ? "bg-slate-50/60 opacity-50" : "hover:bg-slate-50"}
                  >
                    <td className="py-3 pr-2">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={(e) =>
                          updateItem(item.tempId, { selected: e.target.checked })
                        }
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) =>
                          updateItem(item.tempId, { date: e.target.value })
                        }
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.tempId, {
                            description: e.target.value,
                            merchant: e.target.value,
                          })
                        }
                        className="w-full min-w-[200px] rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-800"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <select
                        value={item.categoryId}
                        onChange={(e) =>
                          updateItem(item.tempId, { categoryId: e.target.value })
                        }
                        className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      >
                        {categories
                          .filter((c) => c.type === "EXPENSE")
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={48}
                          value={item.currentInstallment}
                          onChange={(e) =>
                            updateItem(item.tempId, {
                              currentInstallment: Number(e.target.value) || 1,
                            })
                          }
                          className="w-12 rounded-lg border border-slate-200 px-1.5 py-1 text-center text-xs"
                        />
                        <span className="text-xs text-slate-400">/</span>
                        <input
                          type="number"
                          min={1}
                          max={48}
                          value={item.totalInstallments}
                          onChange={(e) => {
                            const tot = Number(e.target.value) || 1;
                            updateItem(item.tempId, {
                              totalInstallments: tot,
                              projectRemainingInstallments:
                                tot > item.currentInstallment,
                            });
                          }}
                          className="w-12 rounded-lg border border-slate-200 px-1.5 py-1 text-center text-xs"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      {item.totalInstallments > item.currentInstallment ? (
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-purple-700">
                          <input
                            type="checkbox"
                            checked={item.projectRemainingInstallments}
                            onChange={(e) =>
                              updateItem(item.tempId, {
                                projectRemainingInstallments: e.target.checked,
                              })
                            }
                            className="h-3.5 w-3.5 rounded text-purple-600"
                          />
                          <Calendar className="h-3.5 w-3.5" />
                          +{item.totalInstallments - item.currentInstallment} meses
                        </label>
                      ) : (
                        <span className="text-xs text-slate-400">À vista / Única</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(item.tempId, {
                            visibility:
                              item.visibility === "SHARED" ? "PRIVATE" : "SHARED",
                          })
                        }
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          item.visibility === "SHARED"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {item.visibility === "SHARED" ? (
                          <>
                            <Users className="h-3 w-3" />
                            Compartilhado
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3" />
                            Privado
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        value={item.amount}
                        onChange={(e) =>
                          updateItem(item.tempId, {
                            amount: Number(e.target.value) || 0,
                          })
                        }
                        className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-right text-xs font-bold text-slate-900"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
