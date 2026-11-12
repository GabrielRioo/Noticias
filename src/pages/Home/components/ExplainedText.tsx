import Tooltip from '@mui/material/Tooltip';
import { mergeGlossary, splitExplainedText } from '../../../utils/glossary';
import type { GlossaryTerm } from '../../../types/news';

type ExplainedTextProps = {
  text: string;
  extraTerms?: GlossaryTerm[];
};

export function ExplainedText({ text, extraTerms }: ExplainedTextProps) {
  const pieces = splitExplainedText(text, mergeGlossary(extraTerms));

  return (
    <>
      {pieces.map((piece, index) => {
        if (!piece.explanation) {
          return <span key={`${piece.text}-${index}`}>{piece.text}</span>;
        }

        return (
          <Tooltip
            key={`${piece.text}-${index}`}
            title={piece.explanation}
            describeChild
            enterTouchDelay={0}
            leaveTouchDelay={2800}
          >
            <span
              tabIndex={0}
              style={{
                borderBottom: '1px dotted currentColor',
                cursor: 'help',
              }}
            >
              {piece.text}
            </span>
          </Tooltip>
        );
      })}
    </>
  );
}
