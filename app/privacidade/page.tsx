export const metadata = {
  title: "Política de Privacidade — Nexo Automação",
  description:
    "Política de Privacidade da Nexo Automação: como coletamos, usamos e protegemos os dados, incluendo mensagens do Instagram e do Facebook.",
};

const UPDATED = "18 de agosto de 2026";

export default function PrivacidadePage() {
  return (
    <main
      style={{
        maxWidth: 820,
        margin: "0 auto",
        padding: "48px 22px 80px",
        lineHeight: 1.65,
      }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 6 }}>Política de Privacidade</h1>
      <p style={{ color: "var(--muted)", marginTop: 0 }}>
        Nexo Automação — última atualização: {UPDATED}
      </p>

      <section>
        <h2 style={{ fontSize: 19, marginTop: 28 }}>1. Quem somos</h2>
        <p>
          A Nexo Automação (&quot;Nexo&quot;, &quot;nós&quot;) é uma iniciativa
          focada em inteligência artificial e automação. Operamos os canais
          digitais da marca, incluindo o site nexoautomacao.net e os perfis
          oficiais no Instagram e no Facebook. Esta Política explica como
          tratamos os dados das pessoas que interagem com esses canais.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 19, marginTop: 28 }}>2. Dados que coletamos</h2>
        <p>Podemos coletar e tratar os seguintes dados:</p>
        <ul>
          <li>
            <strong>Mensagens e conteúdo de atendimento:</strong> o conteúdo das
            mensagens (DMs) que você nos envia pelo Instagram ou Facebook, além
            do seu nome de usuário/identificador público na rede, para responder
            e dar continuidade ao atendimento.
          </li>
          <li>
            <strong>Dados de contato fornecidos por você:</strong> nome, e-mail
            ou telefone, quando você opta por informá-los durante o atendimento.
          </li>
          <li>
            <strong>Dados técnicos:</strong> registros (logs) de interação
            necessários ao funcionamento e à segurança dos nossos serviços.
          </li>
        </ul>
      </section>

      <section>
        <h2 style={{ fontSize: 19, marginTop: 28 }}>
          3. Como usamos os dados
        </h2>
        <ul>
          <li>Responder às suas mensagens e prestar atendimento.</li>
          <li>
            Melhorar a qualidade das respostas e do conteúdo que produzimos.
          </li>
          <li>
            Cumprir obrigações legais e garantir a segurança das operações.
          </li>
        </ul>
        <p>
          Não vendemos os seus dados pessoais e não os utilizamos para
          finalidades incompatíveis com as descritas aqui.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 19, marginTop: 28 }}>
          4. Mensagens do Instagram e do Facebook
        </h2>
        <p>
          Utilizamos as APIs oficiais da Meta (Instagram e Facebook) para
          receber e responder mensagens. O acesso a essas mensagens é feito
          exclusivamente para o atendimento aos usuários que nos contatam. O uso
          e a transferência de informações recebidas dessas APIs seguem as
          políticas da Meta, incluindo os requisitos de uso limitado de dados.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 19, marginTop: 28 }}>
          5. Compartilhamento e armazenamento
        </h2>
        <p>
          Os dados podem ser processados por provedores de infraestrutura e de
          automação que nos apoiam (por exemplo, serviços de hospedagem e de
          banco de dados), sempre sob obrigações de confidencialidade e apenas
          na medida necessária para operar o serviço. Armazenamos os dados pelo
          tempo necessário às finalidades descritas ou conforme exigido por lei.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 19, marginTop: 28 }}>6. Seus direitos</h2>
        <p>
          Você pode solicitar acesso, correção ou exclusão dos seus dados, bem
          como revogar consentimentos, entrando em contato conosco pelos canais
          abaixo. Trataremos os pedidos conforme a legislação aplicável,
          incluindo a LGPD (Lei nº 13.709/2018).
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 19, marginTop: 28 }}>7. Contato</h2>
        <p>
          Dúvidas sobre esta Política ou sobre os seus dados? Fale conosco pelo
          e-mail{" "}
          <a href="mailto:contato@nexoautomacao.net">
            contato@nexoautomacao.net
          </a>{" "}
          ou pelos perfis oficiais @nexo.automacao.
        </p>
      </section>

      <section>
        <h2 style={{ fontSize: 19, marginTop: 28 }}>8. Alterações</h2>
        <p>
          Podemos atualizar esta Política periodicamente. A data da última
          atualização é sempre indicada no topo desta página.
        </p>
      </section>
    </main>
  );
}
