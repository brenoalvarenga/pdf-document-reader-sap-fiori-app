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
                                fullText.match(/Booking\s+Ref\.?\s*[:\-]?\s*(\w{3,}\d{6,})/i) ||
                                fullText.match(/Nossa\s+Refer[êe]ncia\s*[:\-]?\s*(\d{6,})/i) ||
                                fullText.match(/B\s*o+\s*k+\s*i+\s*n+\s*g(?:\s*(?:No(?:\s*\.)?|Number))?\s*[:\-]?\s*(\w{3,}\d{6,})/i);

                            const numeroBooking = match?.[1];

                            const qtdPatterns = [
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
                                /VESSEL\/VOYAGE\s*:\s*([A-Z\s]{3,})\s+[A-Z0-9]{5,}/i,
                                /NAVIO\s+E\s+VIAGEM\s+((?:[A-Z]{2,}\s+){1,3})[A-Z0-9]{5,}/i,
                                /Trunk\s+Vessel\s*:\s*([A-Z\s]{3,})\s+[A-Z0-9]{5,}/i,
                                /reservados\s+no\s+navio\s+([A-Z\s]{3,})\s*\/[A-Z0-9]{3,}/i,
                                /[A-Z]{2,}\s+Agencia Maritima Ltda\s+([A-Z\s]+)\s*\/\s*[A-Z0-9]+/i,
                                /NAVIO\/VIAGEM\s*:\s*((?:[A-Z]{2,}(?:\s+|$)){1,4})\s+[A-Z0-9\-]{5,}/i,
                                /Vessel\s+([A-Z\s]+?)\s+DP\s+Voyage:/i
                            ];
                            const navio = navioPatterns
                                .map(rx => fullText.match(rx)?.[1])
                                .find(Boolean)
                                ?.replace(/\s+\/.*/, '')           // remove tudo após a barra, inclusive
                                ?.replace(/\s+/g, ' ')             // normaliza espaços
                                .trim();

                            const viagemPatterns = [
                                /NAVIO\/VIAGEM\s*:\s*(?:[A-Z]+\s+)+([A-Z0-9\-]{5,})/i,
                                /NAVIO\s+E\s+VIAGEM\s+(?:[A-Z]{2,}\s+){1,3}([A-Z0-9]{5,})/i,
                                /Voyage\s+([A-Z0-9\-]{5,})\s+Vessel/i,
                                /Voy\.\s*No:\s*([A-Z0-9\-]{4,})/i,         // <-- novo caso
                                /INTENDED\s+VESSEL\/VOYAGE\s*:\s*[A-Z\s]+\s+([A-Z0-9()\/\-]{5,})/i,
                                /1st\s+VESSEL\/VOYAGE\s*:\s*[A-Z\s]+\s+([A-Z0-9()\/\-]{5,})/i,
                                /Trunk\s+Vessel\s*:\s*[A-Z\s]+\s+([A-Z0-9()\/\-]{5,})/i,
                                /Voyage\s+([A-Z0-9]{5,})/i,
                                /\/([A-Z0-9]{3,})\./i
                            ];
                            const viagem = viagemPatterns.map(rx => fullText.match(rx)?.[1]?.trim()).find(Boolean)?.replace(/\(.*?\)$/, '').trim();

                            const armadores = ["MEDITERRANEAN SHIPPING COMPANY", "PIL", "MAERSK", "HMM", "COSCO", "EVERGREEN", "HAPAG-LLOYD", "CMA CGM"];
                            const armadorRegex = new RegExp(`\\b(${armadores.map(a => a.replace(/ /g, "\\s+")).join("|")})\\b`, "i");
                            let armadorMatch = fullText.match(armadorRegex);
                            let armador = null;
                            if (armadorMatch) {
                                const found = armadorMatch[0].toUpperCase().replace(/\s+/g, " ").trim();
                                armador = armadores.find(a => found.includes(a));
                            }

                            const portoPatterns = [
                                /(?:^|[^,])\s+([A-Z][A-Z\s]{1,20}?)\s+Port\s+Of\s+Loading:/i,
                                /PORTO\s+ORIGEM\s*:\s*([A-Z\s]+),/i,
                                /PORTO\s+DE\s+EMBARQUE\s+([A-Z]{2,})/i,
                                /PORT\s+OF\s+LOADING\s*:\s*([A-Z][a-z]+)(?:\s*\/|\s*,|\s)/i,
                                /Port\s+of\s+Loading\s*:\s*([A-Z][a-z]+)(?:,|\s|$)/i,
                                /From:\s*([A-Z][a-z]+)/i,
                                /Data\s+est\.\s+de\s+chegada\s+([A-Z]+)/i
                            ];
                            const portoOrigem = portoPatterns.map(rx => fullText.match(rx)?.[1]?.toUpperCase()).find(Boolean);

                            const destinoPatterns = [
                                /porto\s+de\s+destino\s*:\s*([A-Z\s,]+?)\s+SUZANO/i,
                                /FINAL\s+DESTINATION\s*:\s*([A-Z\s,]{3,})/i,
                                /Place\s+of\s+Delivery\s*:\s*([A-Z\s,]{3,})/i,
                                /To:\s*([A-Z\s,]{3,})/i,
                                /destino\s*:\s*([A-Z\s,]{3,})/i
                            ];
                            let destinoFinal = destinoPatterns.map(rx => fullText.match(rx)?.[1]).find(Boolean);
                            if (destinoFinal) {
                                destinoFinal = destinoFinal.split(',')[0].replace(/\s+/g, ' ').trim().toUpperCase()
                                    .replace(/\b([A-Z])\s+([A-Z]{2,5})\b/g, '$1$2')
                                    .replace(/\b([A-Z]{1,2})\s+([A-Z]{1,3})\b/g, (match, p1, p2) => (p1 + p2).length <= 6 ? p1 + p2 : match)
                                    .split(' ').slice(0, 2).join(' ');
                            }

                            const portoDestinoPatterns = [
                                // Novo padrão para capturar porto de destino em tabelas desformatadas
                                // Procura por: PORTO1 (CODE1) PORTO2 (CODE2) - captura PORTO2
                                /\([A-Z]{5,6}\)\s+([A-Z][A-Z\s,]+?),?\s+[A-Z]{2}\s+\([A-Z]{5,6}\)/i,
                                
                                // Padrões existentes
                                /PORTO\s+DE\s+DESCARGA\s*[:\-]?\s*([A-Z\s,]+)/i,
                                /PORT\s+OF\s+DISCHARGE\s*[:\-]?\s*([A-Z\s,]+)/i,
                                /PORTO\s+DESTINO\s*[:\-]?\s*([A-Z\s,]+)/i,
                                /Port\s+of\s+Discharging\s*[:\-]?\s*([A-Z\s,]+)/i,
                                /To:\s*([A-Z\s,]{3,})/i
                            ];
                            
                            let portoDestino = portoDestinoPatterns.map(rx => fullText.match(rx)?.[1]).find(Boolean);
                            if (portoDestino) {
                                portoDestino = portoDestino.split(',')[0].replace(/\s+/g, ' ').trim().toUpperCase()
                                    .replace(/\b([A-Z])\s+([A-Z]{2,5})\b/g, '$1$2')
                                    .replace(/\b([A-Z]{1,2})\s+([A-Z]{1,3})\b/g, (match, p1, p2) => (p1 + p2).length <= 6 ? p1 + p2 : match)
                                    .split(' ').slice(0, 2).join(' ');
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
                                        portoDestino: portoDestino || null
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
