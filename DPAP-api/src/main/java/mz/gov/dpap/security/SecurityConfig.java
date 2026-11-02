package mz.gov.dpap.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import mz.gov.dpap.dto.ErrorResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final ObjectMapper objectMapper;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    /**
     * Origin *patterns* (host/port wildcards) accepted in addition to the exact
     * origins. Lets the web/mobile apps be reached over a LAN IP or hostname
     * without the exact address being known in advance (the common field-server
     * deployment); defaults to the private network ranges. Works with
     * {@code allowCredentials(true)} precisely because it uses patterns.
     */
    @Value("${app.cors.allowed-origin-patterns:}")
    private String allowedOriginPatterns;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter, ObjectMapper objectMapper) {
        this.jwtFilter = jwtFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        // Actor registry writes (BRD §3.3): editors of data and the registry.
                        .requestMatchers(HttpMethod.POST, "/actors")
                            .hasAnyRole("DATA_MANAGER", "SUPERVISOR", "ENUMERATOR", "SYS_ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/actors/*")
                            .hasAnyRole("DATA_MANAGER", "SUPERVISOR", "ENUMERATOR", "SYS_ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/actors/*")
                            .hasAnyRole("DATA_MANAGER", "SYS_ADMIN")
                        // Merge duplicates / publish to registry (BRD §3.3).
                        .requestMatchers(HttpMethod.POST, "/actors/*/merge")
                            .hasAnyRole("DATA_MANAGER", "SYS_ADMIN")
                        // Review comments: supervisors + data managers + admin.
                        .requestMatchers(HttpMethod.POST, "/submissions/*/comments")
                            .hasAnyRole("SUPERVISOR", "DATA_MANAGER", "SYS_ADMIN")
                        // Submission collection: enumerators create/edit; review transitions are
                        // authorized per-action in the service against the actor's team.
                        .requestMatchers(HttpMethod.POST, "/submissions")
                            .hasAnyRole("ENUMERATOR", "SUPERVISOR", "DATA_MANAGER", "SYS_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/submissions/*/transitions")
                            .hasAnyRole("ENUMERATOR", "SUPERVISOR", "DATA_MANAGER", "SYS_ADMIN")
                        .requestMatchers(HttpMethod.POST, "/submissions/*/attachments")
                            .hasAnyRole("ENUMERATOR", "SUPERVISOR", "DATA_MANAGER", "SYS_ADMIN")
                        .requestMatchers("/users/**").hasRole("SYS_ADMIN")
                        .requestMatchers("/audit/**").hasAnyRole("SYS_ADMIN", "DATA_MANAGER")
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((req, res, e) ->
                                writeError(res, HttpServletResponse.SC_UNAUTHORIZED, "UNAUTHORIZED",
                                        "Authentication required"))
                        .accessDeniedHandler((req, res, e) ->
                                writeError(res, HttpServletResponse.SC_FORBIDDEN, "FORBIDDEN",
                                        "Insufficient permissions")))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void writeError(HttpServletResponse res, int status, String code, String message)
            throws java.io.IOException {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(res.getWriter(), new ErrorResponse(message, code));
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        List<String> origins = splitCsv(allowedOrigins);
        if (!origins.isEmpty()) {
            config.setAllowedOrigins(origins);
        }
        List<String> patterns = splitCsv(allowedOriginPatterns);
        if (!patterns.isEmpty()) {
            config.setAllowedOriginPatterns(patterns);
        }
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private static List<String> splitCsv(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
