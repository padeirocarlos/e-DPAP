package mz.gov.dpap.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * A registered actor. The PostGIS geometry column (`geom`) is a DB-generated,
 * GIST-indexed geography point derived from latitude/longitude (see migration
 * V1), so it is not mapped here — the contract exchanges lat/lon.
 */
@Entity
@Table(name = "actor")
@Getter
@Setter
@NoArgsConstructor
public class Actor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, length = 160)
    private String name;

    @Column(name = "registration_number", length = 60)
    private String registrationNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 40)
    private ActorType actorType;

    @Enumerated(EnumType.STRING)
    @Column(name = "legal_status", nullable = false, length = 20)
    private LegalStatus legalStatus;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Sector sector;

    @Column(name = "district_code", nullable = false, length = 16)
    private String districtCode;

    @Column(name = "administrative_post_code", nullable = false, length = 24)
    private String administrativePostCode;

    @Column(name = "locality_code", length = 24)
    private String localityCode;

    @Column(nullable = false)
    private double latitude;

    @Column(nullable = false)
    private double longitude;

    @Column(name = "responsible_person", length = 160)
    private String responsiblePerson;

    @Column(length = 32)
    private String phone;

    @Column(length = 160)
    private String email;

    @Column(length = 240)
    private String address;

    // --- Activity detail (all optional) ---

    @Column(columnDefinition = "text")
    private String description;

    @Column(columnDefinition = "text")
    private String observations;

    /** When the actor's activity began. */
    @Column(name = "start_date")
    private LocalDate startDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "funding_type", length = 32)
    private FundingType fundingType;

    /** Reference (URL) to a photo of the actor/activity. */
    @Column(name = "image_url", length = 512)
    private String imageUrl;

    // --- BRD Module 0 / A / I: general profile (all optional) ---

    @Column(length = 255)
    private String acronym;

    @Column(name = "respondent_sex", length = 16)
    private String respondentSex;

    @Column(name = "respondent_age")
    private Integer respondentAge;

    @Column(name = "respondent_education", length = 24)
    private String respondentEducation;

    @Column(name = "phone_alt", length = 32)
    private String phoneAlt;

    @Column(length = 255)
    private String website;

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "text")
    private List<String> subsectors;

    @Convert(converter = StringListConverter.class)
    @Column(name = "value_chain_links", columnDefinition = "text")
    private List<String> valueChainLinks;

    @Column(name = "operation_level", length = 24)
    private String operationLevel;

    @Convert(converter = StringListConverter.class)
    @Column(name = "districts_of_operation", columnDefinition = "text")
    private List<String> districtsOfOperation;

    @Column(name = "legal_formality", length = 24)
    private String legalFormality;

    @Convert(converter = StringListConverter.class)
    @Column(name = "registration_docs", columnDefinition = "text")
    private List<String> registrationDocs;

    @Column(length = 9)
    private String nuit;

    private Boolean consent;

    @Column(name = "contact_sharing_consent")
    private Boolean contactSharingConsent;

    @Convert(converter = StringListConverter.class)
    @Column(name = "funding_sources", columnDefinition = "text")
    private List<String> fundingSources;

    @Column(name = "received_credit")
    private Boolean receivedCredit;

    @Enumerated(EnumType.STRING)
    @Column(name = "sync_status", nullable = false, length = 16)
    private SyncStatus syncStatus = SyncStatus.SYNCED;

    // --- Registry master keys (BRD FR-REG; added in V6) ---
    /** Permanent registry id, e.g. MPT-&lt;district&gt;-&lt;seq&gt; (assigned on publish). */
    @Column(name = "actor_uid", length = 40)
    private String actorUid;

    @Enumerated(EnumType.STRING)
    @Column(name = "registry_status", nullable = false, length = 16)
    private RegistryStatus registryStatus = RegistryStatus.ACTIVE;

    /** When merged, points at the surviving actor (BR-RG-2 redirect). */
    @Column(name = "merged_into_id", columnDefinition = "uuid")
    private UUID mergedIntoId;

    @Version
    @Column(nullable = false)
    private long version;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "created_by", length = 160)
    private String createdBy;

    @Column(name = "updated_by", length = 160)
    private String updatedBy;
}
