import React, { useState } from 'react';
import { formatRussianPhoneInput, validateB2BForm } from '../utils/storeLogic';

interface B2BSectionProps {
  onOpenCatalog: () => void;
}

export const B2BSection: React.FC<B2BSectionProps> = ({ onOpenCatalog }) => {
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [projectNotes, setProjectNotes] = useState('');
  const [b2bError, setB2bError] = useState<string | null>(null);
  const [submittedCompany, setSubmittedCompany] = useState<string | null>(null);

  const handleB2BSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <section id="b2b" className="screen-section">
      <div className="container stack" style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}>
        {/* Верхняя строка с цветными плашками (исключена из выравнивания высоты двух колонок) */}
        <div className="cluster">
          <span className="meta-badge meta-badge--brand">ДЛЯ БИЗНЕСА</span>
          <span className="meta-badge meta-badge--azure">
            КОРПОРАТИВНЫЙ ЗАКАЗ
          </span>
        </div>

        {/* Двухколоночная сетка одинаковой высоты (align-items: stretch) */}
        <div className="b2b-grid">
          {/* Левая колонка */}
          <div className="split-col-equal">
            <div className="stack" style={{ '--stack-gap': 'var(--space-md)' } as React.CSSProperties}>
              <h2 className="heading-page">
                Индивидуальные серии в вашем фирменном стиле
              </h2>

              <p className="prose-lead text-secondary">
                Мы разрабатываем и создаём авторские изделия для общественных пространств, творческих студий, офисов, заведений и брендов — от акцентного декора и сервировки до фирменных подарков и лимитированных серий.
              </p>
            </div>

            <div className="stack" style={{ '--stack-gap': 'var(--space-xs)' } as React.CSSProperties}>
              <div className="b2b-feature-row b2b-feature-row--azure">
                <div className="heading-group">Точное попадание в цвет и эстетику</div>
                <p className="prose-compact">
                  Подберём оттенки под ваш интерьер или брендбук и добавим аккуратный рельефный логотип на изделия.
                </p>
              </div>
              <div className="b2b-feature-row b2b-feature-row--azure">
                <div className="heading-group">Комфортные тиражи от 10 штук</div>
                <p className="prose-compact">
                  Сделаем тестовый образец перед запуском партии и бережно доставим заказ через Ozon, Яндекс или СДЭК.
                </p>
              </div>
            </div>
          </div>

          {/* Правая колонка: Форма партнёрского запроса (высота равна левой части без плашек) */}
          <div
            className="card split-card-equal"
            style={{
              padding: 'var(--space-lg)',
              cursor: 'default',
              border: '0.0625rem solid var(--color-border-subtle)',
            } as React.CSSProperties}
          >
            <div className="stack" style={{ '--stack-gap': 'var(--space-2xs)' } as React.CSSProperties}>
              <h3 className="heading-modal">Обсудить корпоративный заказ</h3>
              <p className="prose-compact">
                Оставьте контакты — мы свяжемся с вами, предложим варианты оформления и подготовим пробный образец.
              </p>
            </div>

            {submittedCompany ? (
              <div
                className="stack"
                style={{
                  '--stack-gap': 'var(--space-sm)',
                  padding: 'var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface-bg)',
                  border: '0.0625rem solid var(--color-border-strong)',
                } as React.CSSProperties}
                role="status"
              >
                <div className="meta-status text-success">
                  Заявка для «{submittedCompany}» принята
                </div>
                <p className="prose-compact">
                  Спасибо за обращение! Мы свяжемся с вами в ближайшее время, чтобы обсудить детали и сроки.
                </p>
                <button
                  type="button"
                  className="btn btn--surface"
                  data-spring="fast"
                  onClick={() => setSubmittedCompany(null)}
                >
                  Отправить ещё одну заявку
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleB2BSubmit}
                className="split-form-equal"
                noValidate
              >
                <div>
                  <label htmlFor="b2b-company" className="ui-label">
                    Название компании, заведения или проекта
                  </label>
                  <input
                    id="b2b-company"
                    type="text"
                    className="ui-input"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Например: Кофейня «Ботаника»"
                    required
                  />
                </div>

                <div className="cluster" style={{ '--cluster-gap': 'var(--space-sm)' } as React.CSSProperties}>
                  <div style={{ flex: '1 1 10rem' }}>
                    <label htmlFor="b2b-person" className="ui-label">
                      Имя
                    </label>
                    <input
                      id="b2b-person"
                      type="text"
                      className="ui-input"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                      placeholder="Антон"
                      required
                    />
                  </div>
                  <div style={{ flex: '1 1 12rem' }}>
                    <label htmlFor="b2b-contact" className="ui-label">
                      Телефон
                    </label>
                    <input
                      id="b2b-contact"
                      type="tel"
                      inputMode="numeric"
                      className="ui-input"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(formatRussianPhoneInput(e.target.value))}
                      placeholder="+7 (900) 000-00-00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="b2b-notes" className="ui-label">
                    Кратко о задаче и желаемом количестве
                  </label>
                  <textarea
                    id="b2b-notes"
                    rows={2}
                    className="ui-input"
                    value={projectNotes}
                    onChange={(e) => setProjectNotes(e.target.value)}
                    placeholder="Нужны 20 настольных ваз и салфетниц в тёплом терракотовом цвете..."
                  />
                </div>

                {b2bError && (
                  <p className="prose-compact text-danger" role="alert">
                    {b2bError}
                  </p>
                )}

                <button type="submit" className="btn btn--secondary btn--lg" data-spring="fast">
                  Связаться
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
