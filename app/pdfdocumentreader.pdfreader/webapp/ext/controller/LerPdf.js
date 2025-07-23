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

            fileInput.onchange = (e) => {
                const file = e.target.files[0];

                if (!file) {
                    MessageToast.show("Por favor, selecione um arquivo PDF.");
                    return;
                }

                if (file.type !== "application/pdf") {
                    MessageToast.show("Apenas arquivos PDF são permitidos.");
                    return;
                }

                MessageToast.show("📄 PDF carregado. Extraindo texto...");

                const reader = new FileReader();

                reader.onload = async () => {
                    try {
                        const typedarray = new Uint8Array(reader.result);

                        if (!window.pdfjsLib) {
                            throw new Error("PDF.js library not loaded");
                        }

                        const pdfjsLib = window['pdfjsLib'];
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'resources/pdfjs/pdf.worker.min.js';

                        const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                        const page = await pdf.getPage(1);
                        const textContent = await page.getTextContent();
                        const text = textContent.items.map(item => item.str).join(' ');

                        const numeroBooking = text.match(/Nr\.?\s*Booking:\s*(EBKG\d{8})/)?.[1];
                        const pesoMatch = text.match(/([\d.,]+)\s*Kgs/i);
                        const peso = pesoMatch ? pesoMatch[1] : null;

                        if (numeroBooking && peso) {
                            MessageToast.show(`✅ Número do booking: ${numeroBooking}, Peso: ${peso} Kgs`);

                            // Enviar para a entidade document
                            fetch("/service/pdfdocumentreaderService/document", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({ numeroBooking, peso })
                            })
                            .then(response => {
                                if (!response.ok) {
                                    throw new Error("Erro na resposta do serviço");
                                }
                                return response.json();
                            })
                            .then(data => {
                                MessageToast.show("📤 Número de Booking enviado com sucesso.");
                                console.log("Resposta do serviço:", data);
                            })
                            .catch(err => {
                                console.error("❌ Erro ao enviar número de booking:", err);
                                MessageToast.show("Erro ao enviar o número de Booking.");
                            });

                        } else {
                            MessageToast.show("⚠️ Nenhum número de booking encontrado no PDF.");
                        }

                    } catch (err) {
                        console.error("❌ Erro ao processar o PDF:", err);
                        MessageToast.show("Erro ao extrair texto do PDF.");
                    }
                };

                reader.readAsArrayBuffer(file);
            };

            fileInput.click();
        }
    };
});
