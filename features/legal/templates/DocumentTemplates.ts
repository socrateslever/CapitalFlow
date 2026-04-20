
import { formatMoney, numberToWordsBRL } from "../../../utils/formatters";
import { generateNotaPromissoriaHTML } from "./NotaPromissoriaTemplate";

export const DocumentTemplates = {
    // 1. CONFISSÃO DE DÍVIDA - MODELO PARCELADO
    confissaoDividaParcelado: (data: any) => `
        <div class="abnt-document" style="text-align: justify; box-sizing: border-box; position: relative; width: 100%;">
            <style>
                .abnt-document b, .abnt-document strong { font-weight: bold; }
                .abnt-document .centered { text-align: center; }
                .abnt-document .uppercase { text-transform: uppercase; }
                .abnt-document .indent { text-indent: 1.5cm; margin-bottom: 1em; }
                .abnt-document table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1.5pt solid #000; }
                .abnt-document th, .abnt-document td { border: 1pt solid #000; padding: 10px; text-align: center; font-size: 11pt; }
            </style>

            <div class="centered" style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px;">
                <h1 class="uppercase" style="margin: 0; font-size: 14pt; letter-spacing: 1px;">Instrumento Particular de Confissão de Dívida</h1>
                <p style="font-weight: bold; margin-top: 10px; font-size: 10pt;">TÍTULO EXECUTIVO EXTRAJUDICIAL - ART. 784, III DO CPC/2015</p>
            </div>
            
            <p class="indent"><strong>QUADRO DE QUALIFICAÇÃO DAS PARTES:</strong></p>
            <p class="indent"><strong>CREDOR(A):</strong> <b>${data.creditorName.toUpperCase()}</b>, regularmente inscrito(a) no CPF/CNPJ sob o nº <b>${data.creditorDoc}</b>, residente e domiciliado(a) em <b>${data.creditorAddress}</b>.</p>
            <p class="indent"><strong>DEVEDOR(A):</strong> <b>${data.debtorName.toUpperCase()}</b>, regularmente inscrito(a) no CPF/CNPJ sob o nº <b>${data.debtorDoc}</b>, residente e domiciliado(a) em <b>${data.debtorAddress || 'Endereço não informado'}</b>.</p>

            <p class="indent" style="margin-top: 30px;">As partes acima identificadas, de comum acordo, celebram este Instrumento Particular de Confissão de Dívida, o qual se regerá pelas seguintes cláusulas e condições:</p>

            <p class="indent"><strong>CLÁUSULA PRIMEIRA - DO OBJETO E RECONHECIMENTO:</strong> O(A) <strong>DEVEDOR(A)</strong> reconhece e confessa ser devedor(a) ao <strong>CREDOR</strong> da quantia líquida, certa e exigível de <b>${formatMoney(data.totalDebt || data.amount)}</b> (<b>${numberToWordsBRL(data.totalDebt || data.amount)}</b>), referente a obrigações anteriormente assumidas, montante este que será adimplido de forma parcelada em ${data.installments?.length || 1} vezes.</p>
            
            <p class="indent"><strong>CLÁUSULA SEGUNDA - DA FORMA DE PAGAMENTO:</strong> O pagamento do débito reconhecido será realizado de forma <strong>PARCELADA (${data.billingCycle || 'MENSAL'})</strong>, em ${data.installments?.length} parcelas de ${formatMoney(data.installments?.[0]?.amount)}, conforme cronograma abaixo:</p>
            
            <table>
                <thead>
                    <tr style="background: #efefef;">
                        <th>Parcela</th>
                        <th>Vencimento</th>
                        <th>Valor Nominal (R$)</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.installments?.map((inst: any, idx: number) => `
                        <tr>
                            <td><b>Parcela ${(inst.number || idx + 1).toString().padStart(2, '0')}</b></td>
                            <td><b>${new Date(inst.dueDate).toLocaleDateString('pt-BR')}</b></td>
                            <td><b>${formatMoney(inst.amount)}</b></td>
                        </tr>
                    `).join('') || '<tr><td colspan="3">Sem parcelas registradas</td></tr>'}
                </tbody>
            </table>

            <p class="indent"><strong>CLÁUSULA TERCEIRA - DO VENCIMENTO ANTECIPADO:</strong> O atraso superior a 05 (cinco) dias no pagamento de qualquer das parcelas implicará no <strong>VENCIMENTO ANTECIPADO</strong> de toda a dívida remanescente, de pleno direito, independentemente de aviso ou notificação.</p>

            ${data.clauses?.multa ? `<p class="indent"><strong>CLÁUSULA QUARTA - DOS ENCARGOS:</strong> Em caso de mora, incidirá multa de 10% e juros de 1% ao mês.</p>` : ''}
            <p class="indent"><strong>CLÁUSULA QUINTA - DA EFICÁCIA:</strong> Este instrumento constitui título executivo extrajudicial (Art. 784, III CPC).</p>
            ${data.clauses?.foro ? `<p class="indent"><strong>CLÁUSULA SEXTA - DO FORO:</strong> Fica eleito o foro da Comarca de <b>${data.city.toUpperCase()} (${data.state.toUpperCase()})</b>.</p>` : ''}

            <p style="margin-top: 40px; text-align: right;"><b>${data.city.toUpperCase()} (${data.state.toUpperCase()})</b>, em <b>${new Date().toLocaleDateString('pt-BR')}</b>.</p>

            <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; page-break-inside: avoid;">
                <div style="text-align: center; border-top: 1pt solid #000; padding-top: 5px;">
                    <b class="uppercase" style="font-size: 10pt;">${data.debtorName}</b><br/><span style="font-size: 8pt;">DEVEDOR(A)</span>
                </div>
                <div style="text-align: center; border-top: 1pt solid #000; padding-top: 5px;">
                    <b class="uppercase" style="font-size: 10pt;">${data.creditorName}</b><br/><span style="font-size: 8pt;">CREDOR(A)</span>
                </div>
            </div>
        </div>
    `,

    // 2. CONFISSÃO DE DÍVIDA - MODELO PAGAMENTO ÚNICO
    confissaoDividaUnico: (data: any) => `
        <div class="abnt-document" style="text-align: justify; box-sizing: border-box; position: relative; width: 100%;">
            <style>
                .abnt-document b, .abnt-document strong { font-weight: bold; }
                .abnt-document .centered { text-align: center; }
                .abnt-document .uppercase { text-transform: uppercase; }
                .abnt-document .indent { text-indent: 1.5cm; margin-bottom: 1.5em; }
            </style>

            <div class="centered" style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 40px;">
                <h1 class="uppercase" style="margin: 0; font-size: 14pt; letter-spacing: 1px;">Instrumento Particular de Confissão de Dívida</h1>
                <p style="font-weight: bold; margin-top: 10px; font-size: 10pt;">TÍTULO EXECUTIVO EXTRAJUDICIAL - PAGAMENTO ÚNICO</p>
            </div>
            
            <p class="indent"><strong>CREDOR(A):</strong> <b>${data.creditorName.toUpperCase()}</b>, CPF/CNPJ nº <b>${data.creditorDoc}</b>.</p>
            <p class="indent"><strong>DEVEDOR(A):</strong> <b>${data.debtorName.toUpperCase()}</b>, CPF/CNPJ nº <b>${data.debtorDoc}</b>.</p>

            <p class="indent"><strong>CLÁUSULA PRIMEIRA:</strong> O(A) <strong>DEVEDOR(A)</strong> reconhece a dívida de <b>${formatMoney(data.totalDebt || data.amount)}</b> (<b>${numberToWordsBRL(data.totalDebt || data.amount)}</b>).</p>
            
            <p class="indent"><strong>CLÁUSULA SEGUNDA - PAGAMENTO ÚNICO:</strong> O pagamento integral e irrevogável será realizado em uma **ÚNICA PARCELA** no valor de **${formatMoney(data.totalDebt || data.amount)}**, com vencimento improrrogável em **${data.installments?.[0]?.dueDate ? new Date(data.installments[0].dueDate).toLocaleDateString('pt-BR') : '[DATA_VENCIMENTO]'}**.</p>
            
            <p class="indent"><strong>CLÁUSULA TERCEIRA:</strong> O não pagamento na data estipulada implicará no vencimento imediato e execução forçada do título.</p>

            ${data.clauses?.multa ? `<p class="indent"><strong>CLÁUSULA QUARTA:</strong> Multa de 10% e juros de 1% ao mês em caso de atraso.</p>` : ''}
            <p class="indent"><strong>CLÁUSULA QUINTA:</strong> Este título possui eficácia executiva extrajudicial conforme Art. 784, III CPC.</p>

            <p style="margin-top: 100px; text-align: right;"><b>${data.city.toUpperCase()} (${data.state.toUpperCase()})</b>, em <b>${new Date().toLocaleDateString('pt-BR')}</b>.</p>

            <div style="margin-top: 80px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
                <div style="text-align: center; border-top: 1pt solid #000; padding-top: 10px;">
                    <b class="uppercase">${data.debtorName}</b><br/>DEVEDOR(A)
                </div>
                <div style="text-align: center; border-top: 1pt solid #000; padding-top: 10px;">
                    <b class="uppercase">${data.creditorName}</b><br/>CREDOR(A)
                </div>
            </div>
        </div>
    `,

    // Seletor inteligente para compatibilidade reversa
    confissaoDivida: (data: any) => (data.installments?.length || 0) > 1 
        ? DocumentTemplates.confissaoDividaParcelado(data) 
        : DocumentTemplates.confissaoDividaUnico(data),

    notificacao: (data: any) => `
        <div style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.5; color: #000; max-width: 800px; margin: auto;">
            <h2 style="text-align: center; text-transform: uppercase;">Notificação Extrajudicial</h2>
            <p style="text-align: right;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}</p>
            
            <p><strong>A/C Sr(a). ${data.debtorName}</strong><br/>CPF/CNPJ: ${data.debtorDoc}</p>
            
            <p style="margin-top: 30px;">Pela presente notificação, informamos que consta em aberto o débito referente ao contrato <strong>${data.loanId.substring(0,8)}</strong>, vencido em ${new Date(data.dueDate).toLocaleDateString('pt-BR')}, no valor total atualizado de <strong>${formatMoney(data.totalDue)}</strong>.</p>
            
            <p>Solicitamos a regularização do pagamento em até 48 horas para evitar a adoção de medidas judiciais cabíveis e registro em órgãos de proteção ao crédito.</p>
            
            <p style="margin-top: 50px; text-align: center;">Atenciosamente,<br/><strong>${data.creditorName}</strong></p>
        </div>
    `,

    quitacao: (data: any) => `
        <div style="font-family: serif; padding: 50px; line-height: 1.8; color: #000; max-width: 850px; margin: auto; border: 1px solid #ccc;">
            <h1 style="text-align: center; text-transform: uppercase;">Termo de Quitação</h1>
            
            <p>Pelo presente instrumento, eu, <strong>${data.creditorName}</strong>, inscrito(a) no CPF/CNPJ sob o nº ${data.creditorDoc}, declaro para os devidos fins que recebi de <strong>${data.debtorName}</strong>, CPF/CNPJ nº ${data.debtorDoc}, a importância de <strong>${formatMoney(data.totalPaid)}</strong>, referente à liquidação integral do contrato <strong>${data.loanId.substring(0,8)}</strong>.</p>
            
            <p>Com o recebimento desta quantia, dou ao devedor plena, geral e irrevogável quitação de toda e qualquer obrigação referente ao citado contrato, nada mais tendo a reclamar em tempo algum.</p>
            
            <p style="margin-top: 40px; text-align: center;">${data.city}, ${new Date().toLocaleDateString('pt-BR')}</p>
            
            <div style="margin-top: 60px; text-align: center; border-top: 1px solid #000; width: 60%; margin: auto; padding-top: 10px;">
                <strong>${data.creditorName}</strong><br/>Credor
            </div>
        </div>
    `,

    notaPromissoria: (data: any) => generateNotaPromissoriaHTML(data as any)
};
