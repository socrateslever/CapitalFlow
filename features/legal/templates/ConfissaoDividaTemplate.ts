
import { LegalDocumentParams } from "../../../types";
import { formatMoney, numberToWordsBRL } from "../../../utils/formatters";
import { buildConfissaoDividaVM } from "../viewModels/confissaoVM";

export const generateConfissaoDividaHTML = (data: LegalDocumentParams, docId?: string, hash?: string, signatures: any[] = []) => {
    const vm = buildConfissaoDividaVM(data);
    const normalizeRole = (value: string | null | undefined) => {
        const role = String(value || '').trim().toUpperCase();
        if (role === 'DEVEDOR' || role === 'DEBTOR') return 'DEBTOR';
        if (role === 'CREDOR' || role === 'CREDITOR') return 'CREDITOR';
        if (role.startsWith('TESTEMUNHA_')) return role.replace('TESTEMUNHA_', 'WITNESS_');
        if (role.startsWith('WITNESS_')) return role;
        if (role === 'AVALISTA' || role === 'GUARANTOR') return 'AVALISTA';
        return role;
    };
    const findSig = (role: string) => (signatures || []).find(s => normalizeRole(s.role || s.papel) === normalizeRole(role));

    const renderSignatureBlock = (role: string, name: string, doc: string) => {
        const sig = findSig(role);
        const displayRole = role.replace('DEBTOR', 'DEVEDOR').replace('CREDITOR', 'CREDOR').replace('WITNESS', 'TESTEMUNHA').replace('_', ' ');
        
        return `
            <div style="text-align: center; border-top: 1.5pt solid #000; padding-top: 10px; position: relative; page-break-inside: avoid; margin-top: 60px; min-height: 80px;">
                ${sig ? `
                    <div style="position: absolute; top: -85px; left: 50%; transform: translateX(-50%); width: 90%; z-index: 10; pointer-events: none; display: flex; flex-direction: column; align-items: center;">
                        ${sig.assinatura_imagem ? `
                            <img src="${sig.assinatura_imagem}" style="max-height: 70px; max-width: 100%; object-fit: contain; margin-bottom: -15px; filter: contrast(150%) brightness(90%);" />
                        ` : ''}
                        <div style="border: 1px solid #059669; color: #059669; padding: 6px 10px; font-family: sans-serif; font-size: 6pt; font-weight: bold; background: rgba(236, 253, 245, 0.95); border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); line-height: 1.3; text-align: center; border-left: 4px solid #059669;">
                            <span style="font-size: 7pt;">✓ ASSINATURA DIGITAL VÁLIDA</span><br/>
                            <span style="opacity: 0.8;">MP 2.200-2/2001 • DATA: ${new Date(sig.signed_at).toLocaleString('pt-BR')}</span><br/>
                            <span style="opacity: 0.8;">IP: ${sig.ip_origem} • HASH: ${sig.assinatura_hash?.substring(0, 12).toUpperCase()}</span>
                        </div>
                    </div>
                ` : ''}
                <b style="text-transform: uppercase; font-size: 11pt; display: block; margin-bottom: 2px;">${name}</b>
                <span style="font-size: 9pt; color: #444; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${displayRole}</span><br/>
                <small style="font-size: 8pt; color: #666;">DOC: ${doc || 'N/A'}</small>
            </div>
        `;
    };

    const installmentsHtml = (data.installments || []).map((i: any, idx: number) => `
        <tr>
            <td><b>${(i.number || idx + 1)}ª</b></td>
            <td><b>${new Date(i.dueDate).toLocaleDateString('pt-BR')}</b></td>
            <td><b>${formatMoney(i.amount)}</b></td>
        </tr>
    `).join('');

    // Estilo ABNT STRICT 3,3,2,2
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <style>
            @page { 
                size: A4; 
                margin: 0; 
            }
            body { 
                margin: 0; 
                padding: 0; 
                background: #f0f0f0; 
                font-family: 'Times New Roman', Times, serif; 
            }
            .abnt-page {
                width: 210mm;
                min-height: 297mm;
                padding: 3cm 2cm 2cm 3cm; /* ABNT: Superior 3, Direita 2, Inferior 2, Esquerda 3 */
                background: #fff;
                margin: 0 auto;
                box-sizing: border-box;
                position: relative;
                color: #000;
                font-size: 12pt;
                line-height: 1.5;
                text-align: justify;
            }
            .centered { text-align: center; }
            .uppercase { text-transform: uppercase; }
            .indent { text-indent: 1.5cm; margin-bottom: 1em; }
            h1 { font-size: 14pt; margin: 0; text-transform: uppercase; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1.5pt solid #000; }
            th, td { border: 1pt solid #000; padding: 10px; text-align: center; font-size: 11pt; }
            .signatures-grid { 
                display: grid; 
                grid-template-columns: 1fr 1fr; 
                gap: 50px; 
                margin-top: 60px; 
            }
            @media print {
                body { background: #fff; }
                .abnt-page { border: none; box-shadow: none; margin: 0; padding: 3cm 2cm 2cm 3cm !important; }
            }
        </style>
    </head>
    <body title="DOC-${docId || 'PENDENTE'}">
        <div class="abnt-page">
            <div class="centered" style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px;">
                <h1>Instrumento Particular de Confissão de Dívida</h1>
                <p style="font-weight: bold; margin-top: 10px; font-size: 10pt;">TÍTULO EXECUTIVO EXTRAJUDICIAL - ART. 784, III DO CPC/2015</p>
            </div>

            <div class="content">
                ${data.customContent ? data.customContent : `
                    <p class="indent"><strong>CREDOR(A):</strong> <b>${vm.creditorName.toUpperCase()}</b>, ${vm.creditorNationality}, ${vm.creditorMaritalStatus}, ${vm.creditorProfession}, portador(a) do RG nº <b>${vm.creditorRG}</b> e inscrito(a) no CPF/CNPJ sob o nº <b>${vm.creditorDoc}</b>, residente e domiciliado(a) em <b>${vm.creditorAddress}</b>.</p>
                    
                    <p class="indent"><strong>DEVEDOR(A):</strong> <b>${vm.debtorName.toUpperCase()}</b>, ${vm.debtorNationality}, ${vm.debtorMaritalStatus}, ${vm.debtorProfession}, portador(a) do RG nº <b>${vm.debtorRG}</b> e inscrito(a) no CPF/CNPJ sob o nº <b>${vm.debtorDoc}</b>, residente e domiciliado(a) em <b>${vm.debtorAddress}</b>.</p>

                    <p class="indent" style="margin-top: 30px;">As partes acima identificadas celebram este Instrumento Particular de Confissão de Dívida, mediante as seguintes cláusulas:</p>

                    <p class="indent"><strong>CLÁUSULA PRIMEIRA - DO RECONHECIMENTO:</strong> O(A) <strong>DEVEDOR(A)</strong> confessa ser devedor(a) ao <strong>CREDOR</strong> da importância líquida e certa de <b>${formatMoney(data.totalDebt || data.amount)} (${numberToWordsBRL(data.totalDebt || data.amount)})</b>, valor este que engloba o capital e encargos convencionados.</p>
                    
                    <p class="indent"><strong>CLÁUSULA SEGUNDA - PAGAMENTO:</strong> ${
                      (data.installments?.length || 0) > 1 
                        ? `O pagamento será realizado de forma <strong>PARCELADA (${data.billingCycle || 'MENSAL'})</strong>, em ${data.installments?.length} parcelas, conforme cronograma abaixo:`
                        : `O pagamento será realizado em <strong>PARCELA ÚNICA</strong>, na data de <b>${data.installments?.[0]?.dueDate ? new Date(data.installments[0].dueDate).toLocaleDateString('pt-BR') : '[DATA_VENCIMENTO]'}</b>.`
                    }</p>
                    ${(data.installments?.length || 0) > 1 ? `
                    <table>
                        <thead>
                            <tr style="background: #f5f5f5;">
                                <th>Parcela</th>
                                <th>Vencimento</th>
                                <th>Valor (R$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${installmentsHtml}
                        </tbody>
                    </table>
                    ` : ''}

                    <p class="indent"><strong>CLÁUSULA TERCEIRA - MORA:</strong> O inadimplemento de qualquer parcela acarretará o vencimento antecipado do saldo devedor, acrescido de multa de 10%, juros de 1% a.m. e honorários de 20%.</p>
                    
                    <p class="indent"><strong>CLÁUSULA QUARTA:</strong> Este instrumento constitui título executivo extrajudicial nos termos do Art. 784, III do CPC.</p>

                    <p style="margin-top: 40px; text-align: right;"><b>${vm.city.toUpperCase()}, ${new Date().toLocaleDateString('pt-BR')}</b></p>
                `}
            </div>

            <div class="signatures-grid">
                ${renderSignatureBlock('CREDOR', vm.creditorName, vm.creditorDoc)}
                ${renderSignatureBlock('DEVEDOR', vm.debtorName, vm.debtorDoc)}
                ${renderSignatureBlock('WITNESS_1', data.witnesses?.[0]?.name || 'Testemunha 1', (data.witnesses?.[0] as any)?.document || (data.witnesses?.[0] as any)?.documento || '')}
                ${renderSignatureBlock('WITNESS_2', data.witnesses?.[1]?.name || 'Testemunha 2', (data.witnesses?.[1] as any)?.document || (data.witnesses?.[1] as any)?.documento || '')}
            </div>

            <div style="margin-top: 80px; border-top: 0.5pt solid #eee; padding-top: 15px; font-family: sans-serif; font-size: 7pt; color: #888; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid;">
                <div style="flex: 1;">
                    <strong>CapitalFlow Forensic Compliance:</strong><br/>
                    ID DOC: <code style="color: #444;">${docId || 'S/N'}</code> | HASH INTEGRIDADE: <code style="color: #444; font-weight: bold;">${hash?.toUpperCase() || 'AGUARDANDO_ASSINATURA'}</code><br/>
                    Certificado de integridade digital conforme MP 2.200-2/2001. Validade jurídica plena.
                </div>
                <div style="text-align: right; margin-left: 20px; white-space: nowrap;">
                    Página 1 de 1
                </div>
            </div>
        </div>
    </body>
    </html>
    `;
};
