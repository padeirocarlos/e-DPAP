package mz.gov.dpap.config;

import mz.gov.dpap.domain.*;
import mz.gov.dpap.repository.ActorRepository;
import mz.gov.dpap.repository.AppUserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds demo users and sample actors on startup when the tables are empty, so a
 * fresh database is immediately usable. Guarded by `app.seed.demo-data` (default
 * true). Disable in production with `SEED_DEMO_DATA=false`.
 */
@Component
@ConditionalOnProperty(name = "app.seed.demo-data", havingValue = "true", matchIfMissing = true)
public class DataSeeder implements CommandLineRunner {

    private final AppUserRepository users;
    private final ActorRepository actors;
    private final PasswordEncoder encoder;
    private final String demoPassword;

    public DataSeeder(
            AppUserRepository users,
            ActorRepository actors,
            PasswordEncoder encoder,
            org.springframework.core.env.Environment env) {
        this.users = users;
        this.actors = actors;
        this.encoder = encoder;
        this.demoPassword = env.getProperty("app.seed.demo-password", "dpap2024");
    }

    @Override
    public void run(String... args) {
        if (users.count() == 0) {
            // One demo account per BRD role (§3.3).
            seedUser("Administrador do Sistema", "admin@dpap.gov.mz", Role.SYS_ADMIN);
            seedUser("Gestor de Dados", "gestor@dpap.gov.mz", Role.DATA_MANAGER);
            seedUser("Supervisor de Demonstração", "supervisor@dpap.gov.mz", Role.SUPERVISOR);
            seedUser("Inquiridor de Demonstração", "inquiridor@dpap.gov.mz", Role.ENUMERATOR);
            seedUser("Analista de Demonstração", "analista@dpap.gov.mz", Role.ANALYST);
            seedUser("Parceiro de Demonstração", "parceiro@dpap.gov.mz", Role.PARTNER);
        }
        if (actors.count() == 0) {
            seedActors();
        }
    }

    private void seedUser(String name, String email, Role role) {
        AppUser u = new AppUser();
        u.setName(name);
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(demoPassword));
        u.setRole(role);
        u.setEnabled(true);
        users.save(u);
    }

    private void seedActors() {
        actor("Associação Agrícola de Boane", "AG-BOA-001", ActorType.PRODUCER_ASSOCIATION,
                LegalStatus.ASSOCIATION, Sector.AGRICULTURE, "BOA", "BOA-SED", -26.04, 32.33,
                "Ana Mondlane", "+258841234567", "boane.agricola@example.mz");
        actor("Cooperativa de Pescadores da Manhiça", "PE-MAN-014", ActorType.FISHERIES_ACTOR,
                LegalStatus.COOPERATIVE, Sector.FISHERIES, "MAN", "MAN-SED", -25.40, 32.80,
                "João Sitoe", "+258821112233", null);
        actor("Fazenda Pecuária Namaacha", null, ActorType.LIVESTOCK_PRODUCER,
                LegalStatus.COMPANY, Sector.LIVESTOCK, "NAM", "NAM-SED", -26.02, 32.02,
                "Carla Nhaca", "+258843334455", "fazenda.namaacha@example.mz");
        actor("Aquacultura Marracuene Lda", "AQ-MAR-007", ActorType.AQUACULTURE_ACTOR,
                LegalStatus.COMPANY, Sector.AQUACULTURE, "MAR", "MAR-SED", -25.74, 32.67,
                "Paulo Macie", "+258845556677", "aqua.marracuene@example.mz");
        actor("Produtores de Hortícolas de Moamba", null, ActorType.PRODUCER,
                LegalStatus.INDIVIDUAL, Sector.AGRICULTURE, "MOA", "MOA-SED", -25.60, 32.24,
                "Rosa Chissano", null, null);
        actor("ONG Desenvolvimento Rural de Magude", "NGO-MAG-003", ActorType.NGO,
                LegalStatus.NGO, Sector.AGRICULTURE, "MAG", "MAG-SED", -25.02, 32.65,
                "Miguel Tembe", "+258846667788", "ong.magude@example.mz");
        actor("Instituto de Investigação Agrária de Matutuíne", null, ActorType.RESEARCH_INSTITUTION,
                LegalStatus.PUBLIC, Sector.AGRICULTURE, "MAT", "MAT-SED", -26.32, 32.67,
                "Teresa Cossa", "+258847778899", null);
        actor("Empresa Pesqueira de Matutuíne", "PE-MAT-021", ActorType.PRIVATE_COMPANY,
                LegalStatus.COMPANY, Sector.FISHERIES, "MAT", "MAT-ZIT", -26.73, 32.88,
                "Fernando Guambe", "+258848889900", "pesqueira.matutuine@example.mz");
    }

    @SuppressWarnings("checkstyle:ParameterNumber")
    private void actor(String name, String reg, ActorType type, LegalStatus legal, Sector sector,
                       String district, String post, double lat, double lon,
                       String responsible, String phone, String email) {
        Actor a = new Actor();
        a.setName(name);
        a.setRegistrationNumber(reg);
        a.setActorType(type);
        a.setLegalStatus(legal);
        a.setSector(sector);
        a.setDistrictCode(district);
        a.setAdministrativePostCode(post);
        a.setLatitude(lat);
        a.setLongitude(lon);
        a.setResponsiblePerson(responsible);
        a.setPhone(phone);
        a.setEmail(email);
        a.setSyncStatus(SyncStatus.SYNCED);
        a.setCreatedBy("seed");
        a.setUpdatedBy("seed");
        actors.save(a);
    }
}
