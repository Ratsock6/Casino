import ReactMarkdown from 'react-markdown';
import reglement from '../assets/reglement.md?raw';
import '../styles/pages/reglement.scss';

const ReglementPage = () => {
  return (
    <div className="reglement">
      <div className="reglement__content">
        <ReactMarkdown>{reglement}</ReactMarkdown>
      </div>
    </div>
  );
};

export default ReglementPage;