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
                            const page = await pdf.getPage(1);
                            const textContent = await page.getTextContent();
                            const text = textContent.items.map(item => item.str).join(' ');
                            console.log(`Texto extraído de ${file.name}:\n`, text);

                            // Extração do número de booking
                            const match = text.match(/B\s*o+\s*k+\s*i+\s*n+\s*g(?:\s*(?:No(?:\s*\.)?|Number))?\s*[:\-]?\s*(\w{3,}\d{6,})/i);
                            const numeroBooking = match?.[1];

                            // Extração da quantidade de containers com múltiplos padrões
                            const qtdPatterns = [
                                /TOTAL.*?(?:QTY|QUANTITY).*?:\s*(\d{1,3})\s*x/i,
                                /(\d{1,3})\s*x\s*40\s*(?:'|ft)?\s*(?:HI|HIGH|DRY|CUBE|CONTAINER|DR)/i,
                                /(\d{1,3})\s+40\s*(?:'|ft)?\s*(?:HI|HIGH|DRY|CUBE|CONTAINER|DR)/i,
                                /Qty\/Kind.*?(\d{1,3})\s+40/i,
                                /Equipment\s+Type\/Q[’']ty\s*:\s*\w+-\s*(\d{1,3})/i,
                                /Equipment\s+Qty\s*:\s*(\d{1,3})/i
                            ];                                                        
                            const qtdContainer = qtdPatterns.map(rx => text.match(rx)?.[1]).find(Boolean);

                            if (numeroBooking && qtdContainer) {
                                console.log(`✅ [${file.name}] Número do booking: ${numeroBooking}, Qtde containers: ${qtdContainer}`);
                                try {
                                    const response = await fetch("/service/pdfdocumentreaderService/document", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json"
                                        },
                                        body: JSON.stringify({ numeroBooking, qtdContainer })
                                    });

                                    if (!response.ok) {
                                        throw new Error(`Erro na resposta ao enviar ${file.name}`);
                                    }

                                    const data = await response.json();
                                    console.log(`📤 [${file.name}] Booking enviado com sucesso:`, data);
                                    resolve();
                                } catch (sendError) {
                                    console.error(`❌ [${file.name}] Erro ao enviar booking:`, sendError);
                                    reject(sendError);
                                }
                            } else {
                                console.warn(`⚠️ [${file.name}] Dados incompletos no PDF (booking ou qtdContainer ausente).`);
                                resolve();
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
