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

                // Processar todos os PDFs em paralelo
                const processamentos = files.map(file => new Promise((resolve, reject) => {
                    if (file.type !== "application/pdf") {
                        console.warn(`Arquivo ignorado (não é PDF): ${file.name}`);
                        return resolve(); // ignora arquivos não-PDF
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

                            const match = text.match(/B\s*o+\s*k+\s*i+\s*n+\s*g(?:\s*(?:No(?:\s*\.)?|Number))?\s*[:\-]?\s*(\w{3,}\d{6,})/i);
                            const numeroBooking = match?.[1];
                            const pesoMatch = text.match(/([\d.,]+)\s*Kg/i);
                            const peso = pesoMatch ? pesoMatch[1] : null;

                            if (numeroBooking && peso) {
                                console.log(`✅ [${file.name}] Número do booking: ${numeroBooking}, Peso: ${peso} Kgs`);
                                // Enviar para a entidade
                                try {
                                    const response = await fetch("/service/pdfdocumentreaderService/document", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json"
                                        },
                                        body: JSON.stringify({ numeroBooking, peso })
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
                                console.warn(`⚠️ [${file.name}] Dados incompletos no PDF.`);
                                resolve(); // mesmo sem dados válidos, continua
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

                // Esperar todos os processamentos
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
