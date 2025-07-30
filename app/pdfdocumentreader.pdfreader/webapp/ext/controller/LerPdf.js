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

                            // Número do Booking
                            const match = fullText.match(/B\s*o+\s*k+\s*i+\s*n+\s*g(?:\s*(?:No(?:\s*\.)?|Number))?\s*[:\-]?\s*(\w{3,}\d{6,})/i);
                            const numeroBooking = match?.[1];

                            // Quantidade de containers
                            const qtdPatterns = [
                                /TOTAL.*?(?:QTY|QUANTITY).*?:\s*(\d{1,3})\s*x/i,
                                /(\d{1,3})\s*x\s*40\s*(?:'|ft)?\s*(?:HI|HIGH|DRY|CUBE|CONTAINER|DR)/i,
                                /(\d{1,3})\s+40\s*(?:'|ft)?\s*(?:HI|HIGH|DRY|CUBE|CONTAINER|DR)/i,
                                /Qty\/Kind.*?(\d{1,3})\s+40/i,
                                /Equipment\s+Type\/Q[’']ty\s*:\s*\w+-\s*(\d{1,3})/i,
                                /Equipment\s+Qty\s*:\s*(\d{1,3})/i
                            ];
                            const qtdContainer = qtdPatterns.map(rx => fullText.match(rx)?.[1]).find(Boolean);

                            // Nome do navio (com normalização de espaços)
                            const navioPatterns = [
                                /VESSEL\/VOYAGE\s*:\s*([A-Z\s]{3,})\s+[A-Z0-9]{5,}/i,
                                /NAVIO\s+E\s+VIAGEM\s+((?:[A-Z]{2,}\s+){1,3})[A-Z0-9]{5,}/i,
                                /Trunk\s+Vessel\s*:\s*([A-Z\s]{3,})\s+[A-Z0-9]{5,}/i,
                                /reservados\s+no\s+navio\s+([A-Z\s]{3,})\s*\/[A-Z0-9]{3,}/i
                            ];
                            const navio = navioPatterns
                                .map(rx => fullText.match(rx)?.[1])
                                .find(Boolean)?.replace(/\s+/g, ' ').trim();

                            // Código da viagem
                            const viagemPatterns = [
                                /INTENDED\s+VESSEL\/VOYAGE\s*:\s*[A-Z\s]+\s+([A-Z0-9()\/\-]{5,})/i,
                                /1st\s+VESSEL\/VOYAGE\s*:\s*[A-Z\s]+\s+([A-Z0-9()\/\-]{5,})/i,
                                /Trunk\s+Vessel\s*:\s*[A-Z\s]+\s+([A-Z0-9()\/\-]{5,})/i,
                                /NAVIO\s+E\s+VIAGEM\s+(?:[A-Z]{2,}\s+){1,3}([A-Z0-9]{5,})/i,
                                /\/([A-Z0-9]{3,})\./i
                            ];
                            const viagem = viagemPatterns.map(rx => fullText.match(rx)?.[1]?.trim()).find(Boolean);

                            // Armador
                            const armadores = [
                                "MEDITERRANEAN SHIPPING COMPANY",
                                "PIL",
                                "MAERSK",
                                "HMM",
                                "COSCO"
                            ];

                            const armadorRegex = new RegExp(`\\b(${armadores.map(a => a.replace(/ /g, "\\s+")).join("|")})\\b`, "i");
                            let armadorMatch = fullText.match(armadorRegex);
                            let armador = null;

                            if (armadorMatch) {
                                const found = armadorMatch[0].toUpperCase().replace(/\s+/g, " ").trim();
                                armador = armadores.find(a => found.includes(a));
                            }

                            if (numeroBooking && qtdContainer && navio && armador && viagem) {
                                console.log(`✅ [${file.name}] Booking: ${numeroBooking}, Qtde: ${qtdContainer}, Navio: ${navio}, Viagem: ${viagem}, Armador: ${armador}`);

                                try {
                                    const response = await fetch("/service/pdfdocumentreaderService/document", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json"
                                        },
                                        body: JSON.stringify({ numeroBooking, qtdContainer, navio, viagem, armador })
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
                            } else {
                                console.warn(`⚠️ [${file.name}] Dados incompletos.`);
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
