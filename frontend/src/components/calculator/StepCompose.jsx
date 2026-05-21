import StepProducts from './StepProducts';
import StepTeam from './StepTeam';

/** Scope step: products catalog + internal team */
export default function StepCompose(props) {
  const { showProducts, showTeam, onContinue, ...rest } = props;
  return (
    <>
      {showProducts && (
        <StepProducts {...rest} onContinue={showTeam ? undefined : onContinue} />
      )}
      {showTeam && <StepTeam {...rest} onContinue={onContinue} />}
    </>
  );
}
