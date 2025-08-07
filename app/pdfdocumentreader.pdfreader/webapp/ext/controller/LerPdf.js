sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/core/Core"
], function (MessageToast, Core) {
    'use strict';

    return {
        lerPdf: function () {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "application/pdf";
            fileInput.multiple = true;

            fileInput.onchange = async (e) => {
                const files = Array.from(e.target.files);

                if (!files.length) {
                    MessageToast.show("Por favor, selecione ao menos um arquivo PDF.");
                    return;
                }

                if (!window.pdfjsLib) {
                    MessageToast.show("PDF.js não carregado.");
                    return;
                }

                const pdfjsLib = window['pdfjsLib'];
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'resources/pdfjs/pdf.worker.min.js';

                const processamentos = files.map(file => new Promise((resolve, reject) => {
                    if (file.type !== "application/pdf") {
                        console.warn(`Arquivo ignorado (não é PDF): ${file.name}`);
                        return resolve();
                    }

                    const reader = new FileReader();

                    reader.onload = async () => {
                        try {
                            const typedarray = new Uint8Array(reader.result);
                            const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;

                            let fullText = '';
                            const numPages = pdf.numPages;

                            for (let i = 1; i <= numPages; i++) {
                                const page = await pdf.getPage(i);
                                const textContent = await page.getTextContent();
                                const pageText = textContent.items.map(item => item.str).join(' ');
                                fullText += ' ' + pageText;
                            }

                            console.log(`Texto extraído de ${file.name}:\n`, fullText);

                            const match =
                                fullText.match(/(\b\w{3,}\d{6,})\s+Booking\s+Number\b/i) ||
                                fullText.match(/Booking\s+Ref\.?\s*[:\-]?\s*(\w{3,}\d{6,})/i) ||
                                fullText.match(/Nossa\s+Refer[êe]ncia\s*[:\-]?\s*(\d{6,})/i) ||
                                fullText.match(/B\s*o+\s*k+\s*i+\s*n+\s*g(?:\s*(?:No(?:\s*\.)?|Number))?\s*[:\-]?\s*(\w{3,}\d{6,})/i);

                            const numeroBooking = match?.[1];

                            const qtdPatterns = [
                                /(\d{1,3})\s*x\s*40\s*(?:'|ft)?\s*HC\b/i,
                                /TOTAL.*?(?:QTY|QUANTITY).*?:\s*(\d{1,3})\s*x/i,
                                /(\d{1,3})\s*x\s*40\s*(?:'|ft)?\s*(?:HI|HIGH|DRY|CUBE|CONTAINER|DR)/i,
                                /(\d{1,3})\s+40\s*(?:'|ft)?\s*(?:HI|HIGH|DRY|CUBE|CONTAINER|DR)/i,
                                /Qty\/Kind.*?(\d{1,3})\s+40/i,
                                /Equipment\s+Type\/Q[’']ty\s*:\s*\w+-\s*(\d{1,3})/i,
                                /Equipment\s+Qty\s*:\s*(\d{1,3})/i,
                                /Quantity:\s*(?:.*?[-–])?\s*(\d{1,3})\s*x\s*40(?:'|ft)?/i,
                                /(\d{1,3})\s*\/\s*\d{2}(?:'|ft)?\s*(HI[-\s]?CUBE|DRY|REEFER|TANK|OPEN\s*TOP|FLAT\s*RACK|CONTAINER|HC|GP)/i,
                                /\bResumo\s*:\s*(\d+)\s*x\s*\d{2,3}\s*[A-Z]{2,}/i

                            ];
                            const qtdContainer = qtdPatterns.map(rx => fullText.match(rx)?.[1]).find(Boolean);

                            const navioPatterns = [
                                /ETD:\s+([A-Z]{2,}(?:\s+[A-Z]{2,}){1,5})\s*\/\s*[A-Z0-9]{3,}/i,
                                /VESSEL\/VOYAGE\s*:\s*([A-Z\s]{3,})\s+[A-Z0-9]{3,}/i,                          // ajustado: {3,} em vez de {5,}
                                /NAVIO\s+E\s+VIAGEM\s+((?:[A-Z]{2,}\s+){1,3})[A-Z0-9]{3,}/i,                  // ajustado: {3,} em vez de {5,}
                                /Trunk\s+Vessel\s*:\s*([A-Z\s]{3,})\s+[A-Z0-9]{3,}/i,                         // ajustado: {3,} em vez de {5,}
                                /reservados\s+no\s+navio\s+([A-Z\s]{3,})\s*\/[A-Z0-9]{3,}/i,
                                /[A-Z]{2,}\s+Agencia Maritima Ltda\s+([A-Z\s]+)\s*\/\s*[A-Z0-9]+/i,
                                /NAVIO\/VIAGEM\s*:\s*((?:[A-Z]{2,}(?:\s+|$)){1,4})\s+[A-Z0-9\-]{3,}/i,        // ajustado: {3,} em vez de {5,}
                                /Vessel\s+([A-Z\s]+?)\s+DP\s+Voyage:/i,
                                /MVS\s+([A-Z\s]+?)\(SG\)/i,
                                /MVS\s+([A-Z\s]{2,})\s+\d{3}[A-Z]\b/i
                            ];
                            
                            const navio = navioPatterns
                                .map(rx => fullText.match(rx)?.[1])
                                .find(Boolean)
                                ?.replace(/\s+\/.*/, '')           // remove tudo após a barra, inclusive
                                ?.replace(/\s+/g, ' ')             // normaliza espaços
                                .trim();
                            
                            const viagemPatterns = [
                                /ETD:\s+[A-Z\s]+\s*\/\s*([A-Z0-9]{5,})/i,
                                /NAVIO\/VIAGEM\s*:\s*(?:[A-Z]+\s+)+([A-Z0-9\-]{3,})/i,                        // ajustado: {3,} em vez de {5,}
                                /NAVIO\s+E\s+VIAGEM\s+(?:[A-Z]{2,}\s+){1,3}([A-Z0-9]{3,})/i,                 // ajustado: {3,} em vez de {5,}
                                /Voyage\s+([A-Z0-9\-]{3,})\s+Vessel/i,                                        // ajustado: {3,} em vez de {5,}
                                /Voy\.\s*No:\s*([A-Z0-9\-]{3,})/i,                                            // ajustado: {3,} em vez de {4,}
                                /INTENDED\s+VESSEL\/VOYAGE\s*:\s*[A-Z\s]+\s+([A-Z0-9()\/\-]{3,})/i,          // ajustado: {3,} em vez de {5,}
                                /1st\s+VESSEL\/VOYAGE\s*:\s*[A-Z\s]+\s+([A-Z0-9()\/\-]{3,})/i,               // ajustado: {3,} em vez de {5,}
                                /Trunk\s+Vessel\s*:\s*[A-Z\s]+\s+([A-Z0-9()\/\-]{3,})/i,                     // ajustado: {3,} em vez de {5,}
                                /Voyage\s+([A-Z0-9]{3,})/i,
                                /[A-Z]{2,}(?:\s+[A-Z]{2,}){1,6}\s+(?:\([A-Z]{2,}\)\s+)?([A-Z0-9]{3,})\s+\d{4}-\d{2}-\d{2}/,
                                /\b(\d{3}[A-Z])\b/
                            ];
                            
                            const viagem = viagemPatterns.map(rx => fullText.match(rx)?.[1]?.trim()).find(Boolean)?.replace(/\(.*?\)$/, '').trim();
                            
                            const armadores = ["MEDITERRANEAN SHIPPING COMPANY", "PIL", "MAERSK", "HMM", "COSCO", "EVERGREEN", "HAPAG-LLOYD", "CMA CGM", "GRIMALDI"];
                            const armadorRegex = new RegExp(`\\b(${armadores.map(a => a.replace(/ /g, "\\s+")).join("|")})\\b`, "i");
                            let armadorMatch = fullText.match(armadorRegex);
                            let armador = null;
                            if (armadorMatch) {
                                const found = armadorMatch[0].toUpperCase().replace(/\s+/g, " ").trim();
                                armador = armadores.find(a => found.includes(a));
                            }

                            const portoPatterns = [
                                /\bSSZ\d{6,}\b\s+([A-Z]{2,})\b/,
                                /(?:^|[^,])\s+([A-Z][A-Z\s]{1,20}?)\s+Port\s+Of\s+Loading:/i,
                                /PORTO\s+ORIGEM\s*:\s*([A-Z\s]+),/i,
                                /PORTO\s+DE\s+EMBARQUE\s+([A-Z]{2,})/i,
                                /PORT\s+OF\s+LOADING\s*:\s*([A-Z][a-z]+)(?:\s*\/|\s*,|\s)/i,
                                /Port\s+of\s+Loading\s*:\s*([A-Z][a-z]+)(?:,|\s|$)/i,
                                /From:\s*([A-Z][a-z]+)/i,
                                /Data\s+est\.\s+de\s+chegada\s+([A-Z]+)/i
                            ];
                            const portoOrigem = portoPatterns.map(rx => fullText.match(rx)?.[1]?.toUpperCase()).find(Boolean);

                            function normalizeCityName(raw) {
                                return raw
                                  .split(',')[0]                                   // Pega apenas antes da vírgula
                                  .replace(/[,\s]+/g, ' ')                         // Normaliza múltiplos espaços e vírgulas
                                  .replace(/\b([A-Z])\s+(?=[A-Z]\b)/g, '$1')        // Junta letras isoladas (ex: "B a l" → "Bal")
                                  .replace(/([A-Z])\s+(?=[a-z])/g, '$1')            // Junta maiúscula com minúscula (ex: "Tim or" → "Timor")
                                  .replace(/([a-z])\s+(?=[a-z])/g, '$1')            // Junta minúsculas separadas (ex: "vi l le" → "ville")
                                  .replace(/\s{2,}/g, ' ')                          // Remove espaços duplos
                                  .trim()
                                  .split(' ')                                       // Limita a no máximo duas palavras
                                  .slice(0, 2)
                                  .join(' ')
                                  .toUpperCase();                                   // Converte para MAIÚSCULAS
                              }
                              
                              const destinoPatterns = [
                                /\b\w{3,}\d{6,}\b(?:\s+[A-Z]{2,})+\s+([A-Z]{2,})\s+\d{2}-[A-Z]{3}-\d{2}/,
                                /\bPort\s+Of\s+Discharge:\s*([A-Z\s]+?)(?=,\s+[A-Z]{2,3}\s+Final\s+Place\s+Of\s+Delivery)/i,
                                /DESTINO\s+FINAL\s*:\s*([A-Z][A-Z\s]+?)(?=\s*[-,])/i,
                              
                                // NOVA REGRA: Captura destino final de estruturas de tabela "De Para Por"
                                /De\s+Para\s+Por[\s\S]*?\([A-Z]{5,6}\)\s+([A-Z]+(?:\s+[A-Z]+)*?)(?:\s+[A-Z\s]*?\s+\([A-Z]{5,6}\))/i,
                              
                                /\([A-Z]{5,6}\)\s+([A-Z][A-Z\s,]+?),?\s+[A-Z]{2}\s+\([A-Z]{5,6}\)/gi,
                                /porto\s+de\s+destino\s*:\s*([A-Z\s,]+?)\s+SUZANO/i,
                                /FINAL\s+DESTINATION\s*:\s*([A-Z\s,]{3,})/i,
                                /Place\s+of\s+Delivery\s*:\s*([A-Z\s,]{3,})/i,
                                /To:\s*([A-Z\s,]{3,})/i,
                                /destino\s*:\s*([A-Z\s,]{3,})/i
                              ];
                              
                              let destinoFinal = null;
                              
                              // Processa cada padrão em ordem de prioridade
                              for (let i = 0; i < destinoPatterns.length; i++) {
                                const rx = destinoPatterns[i];
                              
                                if (rx.global) {
                                  // Para o padrão global, pega todas as ocorrências e retorna a última
                                  const matches = [...fullText.matchAll(rx)];
                                  if (matches.length > 0) {
                                    destinoFinal = normalizeCityName(matches[matches.length - 1][1]);
                                    break;
                                  }
                                } else {
                                  const match = fullText.match(rx);
                                  if (match && match[1]) {
                                    destinoFinal = normalizeCityName(match[1]);
                                    break;
                                  }
                                }
                              }
                              
                              const portoDestinoPatterns = [
                                /\b\w{3,}\d{6,}\b(?:\s+[A-Z]{2,})+\s+([A-Z]{2,})\s+\d{2}-[A-Z]{3}-\d{2}/,
                                /(?<!,\s*)([A-Z][A-Z\s]{1,20}?)\s+ETA:\s+Port\s+Of\s+Discharge:/i,
                              
                                // NOVA REGRA: Captura porto de estruturas de tabela "De Para Por"
                                /De\s+Para\s+Por[\s\S]*?\([A-Z]{5,6}\)\s+([A-Z]+(?:\s+[A-Z]+)*?)(?:\s+[A-Z\s]*?\s+\([A-Z]{5,6}\))/i,
                              
                                /\([A-Z]{5,6}\)\s+([A-Z][A-Z\s,]+?),?\s+[A-Z]{2}\s+\([A-Z]{5,6}\)/gi,
                              
                                /PORTO\s+DE\s+DESCARGA\s*[:\-]?\s*([A-Z\s,]+)/i,
                                /PORT\s+OF\s+DISCHARGE\s*[:\-]?\s*([A-Z\s,]+)/i,
                                /PORTO\s+DESTINO\s*[:\-]?\s*([A-Z\s,]+)/i,
                                /Port\s+of\s+Discharging\s*[:\-]?\s*([A-Z\s,]+)/i,
                                /To:\s*([A-Z\s,]{3,})/i
                              ];
                              
                              let portoDestino = null;
                              
                              // Processa cada padrão em ordem de prioridade
                              for (let i = 0; i < portoDestinoPatterns.length; i++) {
                                const rx = portoDestinoPatterns[i];
                              
                                if (rx.global) {
                                  const matches = [...fullText.matchAll(rx)];
                                  if (matches.length > 0) {
                                    portoDestino = normalizeCityName(matches[matches.length - 1][1]);
                                    break;
                                  }
                                } else {
                                  const match = fullText.match(rx);
                                  if (match && match[1]) {
                                    portoDestino = normalizeCityName(match[1]);
                                    break;
                                  }
                                }
                              }
                              

                            let etdMatch =
                                fullText.match(/[A-Z]{2,}(?:\s+[A-Z]{2,}){1,}\s+(\d{2}-[A-Z]{3}-\d{4})/i) ||
                                fullText.match(/(\d{2}-[A-Z]{3}-\d{4})\s+\d{2}:\d{2}\s+ETD:/i) ||
                                fullText.match(/Flag:\s*[A-Z\s()]+\s+(\d{2}-[A-Z]{3}-\d{4})/i) ||
                                fullText.match(/Flag:\s+\w+\s+(\d{1,2}-[A-Z]{3}-\d{4})\s+\d{2}:\d{2}\s+\d{1,2}-[A-Z]{3}-\d{4}/i) ||
                                fullText.match(/ETD\s*:\s*(\d{4}\/\d{2}\/\d{2})/i) ||
                                fullText.match(/ETA\/ETD\s*:\s*\d{2}[A-Z]{3}\d{2}\/(\d{2}[A-Z]{3}\d{2})/i) ||
                                fullText.match(/ETD\s*[:\-]?\s*(\d{1,2}\s+[A-Z]{3}\s+\d{4})/i);

                            let etd = etdMatch?.[1] || null;

                            // Fallback: se ainda não achou, usa a lógica pós-viagem
                            if (!etd) {
                                const viagemRegex = /\b\d{3}[A-Z]\b/;
                                const viagemMatch = fullText.match(viagemRegex);
                                if (viagemMatch) {
                                    const viagemIndex = fullText.indexOf(viagemMatch[0]);
                                    const textAfterViagem = fullText.slice(viagemIndex + viagemMatch[0].length);
                                    const dateMatch = textAfterViagem.match(/\b\d{4}-\d{2}-\d{2}\b/);
                                    etd = dateMatch?.[0] || null;
                                }
                            }

                            // Nova lógica para ETA
                            const etaPatterns = [
                                /\b(\d{2}-[A-Z]{3}-\d{4})\b(?=\s+\d{2}:\d{2}\s+\d+\s*x\s*40)/i,
                                /(\d{4}-\d{2}-\d{2})\s+Please\s+consider\s+that/i,
                                /Flag:\s+\w+\s+\d{1,2}-[A-Z]{3}-\d{4}\s+\d{2}:\d{2}\s+(\d{1,2}-[A-Z]{3}-\d{4})/i,
                                /ETA\s*:\s*(\d{2}[A-Z]{3}\d{2})/gi,
                                /ESTIMATED\s+CARGO\s+AVAILABILITY\s+AT\s+DESTINATION\s+HUB\s*:\s*(\d{2}\s+[A-Z]{3}\s+\d{4})/i,
                                /(\d{2}-[A-Z]{3}-\d{4})\s+Page\s+\d+/i,
                                /(\d{2}-[A-Z]{3}-\d{4})\s+\d{2}:\d{2}\s+[A-Z\s]+ETA:/gi,
                                /ETA\s+DATE\s*:\s*(\d{4}\/\d{2}\/\d{2})/gi,
                                /ETA\s*:\s*(\d{4}\/\d{2}\/\d{2})/gi,
                                /ETA\s+(\d{4}-\d{2}-\d{2})/i,
                                /ETA\s*:\s*(\d{2}\/\d{2}\/\d{4})/i
                            ];
                            
                            let eta = etaPatterns.map(rx => {
                                if (rx.global) {
                                    const matches = [...fullText.matchAll(rx)];
                                    if (rx.source.includes('ETA\\s*:\\s*\\d{2}[A-Z]{3}\\d{2}')) {
                                        return matches.length >= 2 ? matches[1][1] : matches[0]?.[1];
                                    } else if (rx.source.includes('ETA:')) {
                                        return matches.length >= 2 ? matches[1][1] : matches[0]?.[1];
                                    } else {
                                        return matches.length >= 2 ? matches[1][1] : matches[0]?.[1];
                                    }
                                }
                                return fullText.match(rx)?.[1];
                            }).find(Boolean);
                            
                            // Fallback: se nenhum padrão funcionar, extrai a segunda data após a viagem
                            if (!eta) {
                                const viagemRegex = /\b\d{3}[A-Z]\b/;
                                const viagemMatch = fullText.match(viagemRegex);
                                if (viagemMatch) {
                                    const viagemIndex = fullText.indexOf(viagemMatch[0]);
                                    const textAfterViagem = fullText.slice(viagemIndex + viagemMatch[0].length);
                                    const dateMatches = [...textAfterViagem.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)];
                                    if (dateMatches.length >= 2) {
                                        eta = dateMatches[1][0]; // segunda data = ETA
                                    }
                                }
                            }                            

                            console.log(`📦 [${file.name}] Enviando mesmo com possíveis campos incompletos.`);

                            try {
                                const response = await fetch("/service/pdfdocumentreaderService/document", {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json"
                                    },
                                    body: JSON.stringify({
                                        numeroBooking: numeroBooking || null,
                                        qtdContainer: qtdContainer || null,
                                        navio: navio || null,
                                        viagem: viagem || null,
                                        armador: armador || null,
                                        portoOrigem: portoOrigem || null,
                                        destinoFinal: destinoFinal || null,
                                        portoDestino: portoDestino || null,
                                        etd: etd || null,
                                        eta: eta || null
                                    })
                                });

                                if (!response.ok) {
                                    throw new Error(`Erro na resposta ao enviar ${file.name}`);
                                }

                                const data = await response.json();
                                console.log(`📤 [${file.name}] Dados enviados com sucesso:`, data);
                                resolve();
                            } catch (sendError) {
                                console.error(`❌ [${file.name}] Erro ao enviar dados:`, sendError);
                                reject(sendError);
                            }
                        } catch (err) {
                            console.error(`❌ [${file.name}] Erro ao processar PDF:`, err);
                            reject(err);
                        }
                    };

                    reader.onerror = () => {
                        reject(`Erro ao ler o arquivo ${file.name}`);
                    };

                    reader.readAsArrayBuffer(file);
                }));

                try {
                    await Promise.allSettled(processamentos);
                    MessageToast.show("📄 Todos os arquivos foram processados.");
                } catch (e) {
                    MessageToast.show("⚠️ Um ou mais arquivos falharam.");
                }
            };

            fileInput.click();
        }
    };
});
