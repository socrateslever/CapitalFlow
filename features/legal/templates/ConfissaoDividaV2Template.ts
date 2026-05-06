import { LegalDocumentParams } from "../../../types";
import { numberToWordsBRL } from "../../../utils/formatters";
import { buildConfissaoDividaVM } from "../viewModels/confissaoVM";

const FILL = "[PREENCHER]";

const safeText = (value: unknown): string => {
  if (value === null || value === undefined) return FILL;
  const text = String(value).trim();
  return text.length > 0 ? text : FILL;
};

const safeDateBR = (value: unknown): string => {
  if (!value) return FILL;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? FILL : date.toLocaleDateString("pt-BR");
};

const safePercent = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return FILL;
  return String(value);
};

const safeRole = (sig: any): string => sig?.role || sig?.papel || "";
const normalizeRole = (value: string | null | undefined) => {
  const role = String(value || "").trim().toUpperCase();
  if (role === "DEVEDOR" || role === "DEBTOR") return "DEBTOR";
  if (role === "CREDOR" || role === "CREDITOR") return "CREDITOR";
  if (role.startsWith("TESTEMUNHA_")) return role.replace("TESTEMUNHA_", "WITNESS_");
  if (role.startsWith("WITNESS_")) return role;
  if (role === "AVALISTA" || role === "GUARANTOR") return "AVALISTA";
  return role;
};

export const generateConfissaoDividaV2HTML = (
  data: LegalDocumentParams,
  docId?: string,
  hash?: string,
  signatures: any[] = []
) => {
  const vm = buildConfissaoDividaVM(data);

  const findSig = (role: string) =>
    (signatures || []).find((s) => normalizeRole(safeRole(s)) === normalizeRole(role));

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
        <b style="text-transform: uppercase; font-size: 11pt; display: block; margin-bottom: 2px;">${safeText(name)}</b>
        <span style="font-size: 9pt; color: #444; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${displayRole}</span><br/>
        <small style="font-size: 8pt; color: #666;">DOC: ${safeText(doc)}</small>
      </div>
    `;
  };

  const totalDebtNumber = Number(data.totalDebt || 0);
  const valorExtenso = totalDebtNumber > 0 ? numberToWordsBRL(totalDebtNumber) : FILL;

  const multa = safePercent(data.multaPercentual);
  const juros = safePercent(data.jurosMensal);
  const honorarios = safePercent(data.honorariosPercentual);

  const installments = Array.isArray(data.installments) ? data.installments : [];
  const isSinglePayment = installments.length === 1;
  const installmentsCount = installments.length;

  // Detecção Inteligente do Tipo de Contrato
  let formaPagamento = "PAGAMENTO ÚNICO";
  let descricaoPagamento = `será quitado em <strong>PARCELA ÚNICA</strong>`;

  if (installmentsCount > 1) {
    const cycle = data.billingCycle?.toUpperCase() || "MENSAL";
    const valParcela = installments[0]?.amount ? numberToWordsBRL(installments[0].amount).toUpperCase() : FILL;
    const valFormatado = installments[0]?.amount ? `R$ ${Number(installments[0].amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : FILL;
    
    formaPagamento = `PARCELADO (${cycle})`;
    descricaoPagamento = `será quitado de forma <strong>PARCELADA (${cycle})</strong>, em ${installmentsCount} parcelas de ${valFormatado} (${valParcela})`;
  }

  const valParcelaFormatted = installments[0]?.amount ? `R$ ${Number(installments[0].amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : FILL;

  const primeiroVencimento = installments[0]?.dueDate
    ? safeDateBR(installments[0].dueDate)
    : FILL;

  let clauseNumber = 5;
  const extraClauses: string[] = [];

  if (data.incluirGarantia) {
    extraClauses.push(`
      <h2>CLÁUSULA ${clauseNumber} - DA GARANTIA</h2>
      <p>Para assegurar o cumprimento da obrigação, o DEVEDOR oferece como garantia:</p>
      <p>Tipo: ${safeText(data.tipoGarantia)}<br/>
      Descrição: ${safeText(data.descricaoGarantia)}</p>
      <p>A garantia poderá ser executada em caso de inadimplência, independentemente de notificação judicial.</p>
    `);
    clauseNumber += 1;
  }

  if (data.incluirAvalista) {
    extraClauses.push(`
      <h2>CLÁUSULA ${clauseNumber} - DO AVALISTA</h2>
      <p>O AVALISTA abaixo identificado assume responsabilidade solidária pelo pagamento integral da dívida.</p>
      <p>AVALISTA: ${safeText(data.avalistaNome)}<br/>
      CPF: ${safeText(data.avalistaCPF)}<br/>
      ENDEREÇO: ${safeText(data.avalistaEndereco)}</p>
    `);
    clauseNumber += 1;
  }

  if (data.incluirPenhoraAutomatica) {
    extraClauses.push(`
      <h2>CLÁUSULA ${clauseNumber} - DA AUTORIZAÇÃO DE PENHORA</h2>
      <p>O DEVEDOR autoriza expressamente, em caso de inadimplemento, a constrição judicial de bens suficientes à satisfação da dívida.</p>
    `);
    clauseNumber += 1;
  }

  const foroClauseNumber = clauseNumber;

  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <style>
      @page { size: A4; margin: 2.5cm; }
      body { font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000; font-size: 11pt; padding: 0; margin: 0; }
      .container { max-width: 800px; margin: auto; }
      .header-box { text-align: center; border: 2px solid #000; padding: 20px; margin-bottom: 30px; }
      h1 { font-size: 14pt; margin: 0; text-transform: uppercase; letter-spacing: 1px; font-weight: bold; }
      h2 { font-size: 11pt; margin: 25px 0 15px 0; text-transform: uppercase; font-weight: bold; }
      .signatures-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px; page-break-inside: avoid; }
      .nota-promissoria { margin-top: 100px; border: 4px double #000; padding: 30px; page-break-before: always; }
      .np-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
      .np-title { font-size: 18pt; font-weight: bold; }
      .np-value { font-size: 16pt; font-weight: bold; border: 1px solid #000; padding: 5px 10px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header-box">
        <h1>INSTRUMENTO PARTICULAR DE CONFISSÃO DE DÍVIDA E PROMESSA DE PAGAMENTO</h1>
      </div>

      ${
        data.customContent
          ? `<div style="margin-bottom: 40px;">${data.customContent}</div>`
          : `
        <p><strong>PARTES</strong></p>
        <p><strong>CREDOR:</strong> ${safeText(vm.creditorName)}, ${safeText(vm.creditorNationality)}, ${safeText(vm.creditorMaritalStatus)}, ${safeText(vm.creditorProfession)}, portador do RG nº ${safeText(vm.creditorRG)} e CPF nº ${safeText(vm.creditorDoc)}, residente e domiciliado na ${safeText(vm.creditorAddress)}.</p>
        <p><strong>DEVEDOR:</strong> ${safeText(vm.debtorName)}, ${safeText(vm.debtorNationality)}, ${safeText(vm.debtorMaritalStatus)}, ${safeText(vm.debtorProfession)}, portador do RG nº ${safeText(vm.debtorRG)} e CPF nº ${safeText(vm.debtorDoc)}, residente e domiciliado na ${safeText(vm.debtorAddress)}.</p>

        <h2>CLÁUSULA 1 - DO RECONHECIMENTO DA DÍVIDA</h2>
        <p>O DEVEDOR declara e reconhece, de forma irrevogável e irretratável, que possui uma dívida líquida, certa e exigível com o CREDOR no valor total de <strong>${safeText(vm.totalDebt)} (${valorExtenso})</strong>.</p>
        <p><strong>PARÁGRAFO ÚNICO:</strong> O presente instrumento constitui Título Executivo Extrajudicial, nos termos do Artigo 784, inciso III, do Código de Processo Civil, apto a embasar execução judicial imediata.</p>

        <h2>CLÁUSULA 2 - DA FORMA DE PAGAMENTO</h2>
        <p>O débito confessado ${descricaoPagamento}, com vencimento em ${primeiroVencimento}.</p>
        <p><strong>PAGAMENTO:</strong> O pagamento deverá ser efetuado diretamente ao CREDOR, servindo o comprovante de transferência ou depósito como recibo definitivo de quitação.</p>

        <h2>CLÁUSULA 3 - DOS ENCARGOS POR ATRASO (MORA)</h2>
        <p>O não pagamento na data estipulada na Cláusula 2ª implicará, independente de notificação:</p>
        <ol>
          <li>Vencimento imediato da dívida integral;</li>
          <li>Incidência de multa moratória de ${multa}% sobre o valor total;</li>
          <li>Juros de mora de ${juros}% ao mês;</li>
          <li>Honorários advocatícios de ${honorarios}% em caso de cobrança judicial.</li>
        </ol>

        <h2>CLÁUSULA 4 - DA RESPONSABILIDADE PATRIMONIAL E MEDIDAS COERCITIVAS</h2>
        <p>O DEVEDOR declara estar ciente de que responde pelo cumprimento desta obrigação com todos os seus bens presentes e futuros (Art. 789 do CPC). Em caso de mora, fica o CREDOR autorizado a requerer o bloqueio de ativos financeiros via SISBAJUD, restrição de veículos via RENAJUD e a inclusão do nome do DEVEDOR nos órgãos de proteção ao crédito (SPC/SERASA).</p>

        ${extraClauses.join("\n")}

        <h2>CLÁUSULA ${foroClauseNumber} - DO FORO</h2>
        <p>As partes elegem o foro da Comarca de ${safeText(vm.city)} para dirimir quaisquer dúvidas oriundas deste instrumento.</p>

        <p style="margin-top: 30px;">${safeText(vm.city)}, ${safeDateBR(data.contractDate || vm.date)}.</p>
      `
      }

      <div class="signatures-grid">
        ${renderSignatureBlock("CREDOR", safeText(vm.creditorName), safeText(vm.creditorDoc))}
        ${renderSignatureBlock("DEVEDOR", safeText(vm.debtorName), safeText(vm.debtorDoc))}
        ${data.incluirAvalista ? renderSignatureBlock("AVALISTA", safeText(data.avalistaNome), safeText(data.avalistaCPF)) : ""}
      </div>

      <p style="margin-top: 40px;">TESTEMUNHAS:</p>
      <div class="signatures-grid">
        ${renderSignatureBlock("TESTEMUNHA_1", safeText(data.witnesses?.[0]?.name), safeText((data.witnesses?.[0] as any)?.document || (data.witnesses?.[0] as any)?.documento))}
        ${renderSignatureBlock("TESTEMUNHA_2", safeText(data.witnesses?.[1]?.name), safeText((data.witnesses?.[1] as any)?.document || (data.witnesses?.[1] as any)?.documento))}
      </div>

      <div style="margin-top: 80px; padding-top: 15px; border-top: 0.5pt solid #eee; font-family: sans-serif; font-size: 7pt; color: #888; display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="flex: 1;">
            <strong>CapitalFlow Forensic Compliance:</strong><br/>
            ID DOC: <code style="color: #444;">${docId || 'S/N'}</code> | HASH INTEGRIDADE: <code style="color: #444; font-weight: bold;">${hash?.toUpperCase() || 'AGUARDANDO_ASSINATURA'}</code><br/>
            Certificado de integridade digital conforme MP 2.200-2/2001. Validade jurídica plena.
        </div>
        <div style="text-align: right; margin-left: 20px; white-space: nowrap;">
            Página 1 de 1
        </div>
      </div>

      <div class="nota-promissoria">
        <div class="np-header">
          <div class="np-title">NOTA PROMISSÓRIA</div>
          <div class="np-value">${safeText(vm.totalDebt)}</div>
        </div>

        <p>Valor: <strong>${safeText(vm.totalDebt)} (${valorExtenso})</strong></p>
        <p>Na data de vencimento acordada, pagarei incondicionalmente a <strong>${safeText(vm.creditorName)}</strong>, CPF nº ${safeText(vm.creditorDoc)}, a quantia acima descrita${installmentsCount > 1 ? `, em ${installmentsCount} parcelas de ${valParcelaFormatted}` : ' em parcela única'}.</p>
        <p>Emitente (Devedor): <strong>${safeText(vm.debtorName)}</strong><br/>
        CPF: ${safeText(vm.debtorDoc)}</p>
        <p>Local: ${safeText(vm.city)}<br/>
        Data: ${safeDateBR(data.contractDate || vm.date)}</p>

        <div style="margin-top: 40px; border-top: 1px solid #000; width: 60%; text-align: center; padding-top: 5px;">
          Assinatura do Devedor
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
};
