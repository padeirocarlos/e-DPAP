package mz.gov.dpap.repository;

import java.util.UUID;
import mz.gov.dpap.domain.SurveyRound;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SurveyRoundRepository extends JpaRepository<SurveyRound, UUID> {
}
